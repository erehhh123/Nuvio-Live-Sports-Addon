const { parseId } = require('../utils/ids');

const SPORT_CATALOGS = {
  nuvio_sports_football: ['football'],
  nuvio_sports_basketball: ['basketball'],
  nuvio_sports_combat: ['mma', 'boxing', 'wrestling', 'fight'],
  nuvio_sports_motorsport: ['motorsport', 'racing', 'motor sports'],
  nuvio_sports_other: []
};

class Aggregator {
  constructor(providers) {
    this.providers = providers;
    this.byId = new Map(providers.map(p => [p.id, p]));
  }

  async allItems() {
    const results = await Promise.allSettled(this.providers.map(p => p.getItems()));
    return results.flatMap((result, i) => {
      if (result.status === 'fulfilled') return Array.isArray(result.value) ? result.value : [];
      console.warn(`[${this.providers[i].id}] getItems failed: ${result.reason?.message || result.reason}`);
      return [];
    });
  }

  async catalog(catalogId, extra = {}) {
    let items = await this.allItems();
    const now = Date.now();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + 24 * 60 * 60_000;

    if (catalogId === 'nuvio_sports_test') items = items.filter(x => x.provider === 'test');
    else if (catalogId === 'nuvio_sports_live') items = items.filter(x => x.live && !x.is24_7 && x.provider !== 'test');
    else if (catalogId === 'nuvio_sports_today') {
      items = items.filter(x => x.provider !== 'test' && (x.is24_7 || x.live || (x.startTime && x.startTime >= dayStart.getTime() && x.startTime < dayEnd)));
    }
    else if (catalogId === 'nuvio_sports_networks') items = items.filter(x => x.is24_7 && x.provider !== 'test');
    else if (catalogId === 'nuvio_sports_upcoming') items = items.filter(x => !x.is24_7 && x.startTime && x.startTime > now);
    else if (SPORT_CATALOGS[catalogId]) {
      const allowed = SPORT_CATALOGS[catalogId];
      if (allowed.length) items = items.filter(x => allowed.includes(x.category));
      else items = items.filter(x => !['football','basketball','mma','boxing','wrestling','fight','motorsport','racing','motor sports'].includes(x.category));
    }

    if (extra.genre) items = items.filter(x => x.category === String(extra.genre).toLowerCase());
    if (extra.search) {
      const q = String(extra.search).toLowerCase();
      items = items.filter(x => `${x.title} ${x.league} ${x.category} ${x.providerName}`.toLowerCase().includes(q));
    }

    const unique = new Map();
    for (const item of items) unique.set(item.id, item);
    return [...unique.values()].sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      if (a.is24_7 !== b.is24_7) return a.is24_7 ? -1 : 1;
      return (a.startTime || Number.MAX_SAFE_INTEGER) - (b.startTime || Number.MAX_SAFE_INTEGER);
    }).slice(0, 150);
  }

  async stats() {
    const items = await this.allItems();
    const providers = {};
    for (const item of items) {
      providers[item.provider] ||= { total: 0, live: 0, channels24_7: 0, upcoming: 0 };
      providers[item.provider].total += 1;
      if (item.live) providers[item.provider].live += 1;
      if (item.is24_7) providers[item.provider].channels24_7 += 1;
      if (!item.live && !item.is24_7 && item.startTime && item.startTime > Date.now()) providers[item.provider].upcoming += 1;
    }
    return { total: items.length, providers };
  }

  async item(stremioId) {
    const parsed = parseId(stremioId);
    if (!parsed) return null;
    const provider = this.byId.get(parsed.provider);
    return provider ? provider.getItem(parsed.id) : null;
  }

  async streams(stremioId) {
    const parsed = parseId(stremioId);
    if (!parsed) return [];
    const provider = this.byId.get(parsed.provider);
    return provider ? provider.getStreams(parsed.id) : [];
  }

  async health() {
    return Promise.all(this.providers.map(p => p.health()));
  }
}

module.exports = Aggregator;
