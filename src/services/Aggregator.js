const { parseId } = require('../utils/ids');

const SPORT_CATALOGS = {
  nuvio_sports_football: ['football'],
  nuvio_sports_basketball: ['basketball'],
  nuvio_sports_combat: ['mma', 'boxing', 'wrestling'],
  nuvio_sports_motorsport: ['motorsport', 'racing'],
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
      if (result.status === 'fulfilled') return result.value;
      console.warn(`[${this.providers[i].id}] getItems failed: ${result.reason?.message || result.reason}`);
      return [];
    });
  }

  async catalog(catalogId, extra = {}) {
    let items = await this.allItems();
    const now = Date.now();
    if (catalogId === 'nuvio_sports_live') items = items.filter(x => x.live && !x.is24_7);
    else if (catalogId === 'nuvio_sports_networks') items = items.filter(x => x.is24_7);
    else if (catalogId === 'nuvio_sports_upcoming') items = items.filter(x => !x.is24_7 && x.startTime && x.startTime > now);
    else if (SPORT_CATALOGS[catalogId]) {
      const allowed = SPORT_CATALOGS[catalogId];
      if (allowed.length) items = items.filter(x => allowed.includes(x.category));
      else items = items.filter(x => !['football','basketball','mma','boxing','wrestling','motorsport','racing'].includes(x.category));
    }

    if (extra.genre) items = items.filter(x => x.category === String(extra.genre).toLowerCase());
    if (extra.search) {
      const q = String(extra.search).toLowerCase();
      items = items.filter(x => `${x.title} ${x.league} ${x.category}`.toLowerCase().includes(q));
    }

    const unique = new Map();
    for (const item of items) unique.set(item.id, item);
    return [...unique.values()].sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      return (a.startTime || Number.MAX_SAFE_INTEGER) - (b.startTime || Number.MAX_SAFE_INTEGER);
    }).slice(0, 100);
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
