const BaseProvider = require('./BaseProvider');
const { makeId } = require('../utils/ids');
const { normalizeCategory, isProbablyLive, posterFallback } = require('../utils/normalize');
const { MirrorManager, discoverStreamedOfficialMirrors } = require('../services/MirrorManager');

class StreamedProvider extends BaseProvider {
  constructor({ cache, config }) {
    super({ cache });
    this.id = 'streamed';
    this.name = 'Streamed';
    this.config = config;
    this.mirrors = new MirrorManager({
      name: 'streamed',
      bases: config.bases,
      timeoutMs: config.timeoutMs,
      cache,
      mirrorIndex: config.discoverOfficialMirrors ? config.mirrorIndex : '',
      discover: discoverStreamedOfficialMirrors
    });
  }

  async getItems() {
    return this.cache.remember('provider:streamed:items', async () => {
      const [{ value: live }, { base, value: today }] = await Promise.all([
        this.mirrors.requestJson('/api/matches/live'),
        this.mirrors.requestJson('/api/matches/all-today')
      ]);
      const liveIds = new Set((Array.isArray(live) ? live : []).map(x => String(x.id)));
      const merged = new Map();
      for (const raw of [...(Array.isArray(live) ? live : []), ...(Array.isArray(today) ? today : [])]) {
        if (!raw || raw.id == null) continue;
        merged.set(String(raw.id), this.normalize(raw, base, liveIds.has(String(raw.id))));
      }
      return [...merged.values()].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    });
  }

  normalize(raw, base, explicitLive) {
    const category = normalizeCategory(raw.category);
    const poster = raw.poster
      ? `${base}${String(raw.poster).endsWith('.webp') ? raw.poster : `${raw.poster}.webp`}`
      : posterFallback(category);
    return {
      id: makeId(this.id, raw.id),
      provider: this.id,
      providerName: this.name,
      sourceId: String(raw.id),
      title: raw.title || `Sports event ${raw.id}`,
      category,
      league: category,
      startTime: Number(raw.date) || null,
      live: isProbablyLive(raw.date, explicitLive),
      is24_7: false,
      poster,
      description: `${category} event from Streamed metadata.`,
      rawSources: Array.isArray(raw.sources) ? raw.sources : []
    };
  }

  async getItem(sourceId) {
    const items = await this.getItems();
    return items.find(x => x.sourceId === String(sourceId)) || null;
  }

  // Intentionally does not call Streamed's stream/embed endpoint.
  // Add direct playback through AuthorizedJsonProvider for media you may redistribute.
  async getStreams() { return []; }

  async health() {
    return { provider: this.id, mirrors: await this.mirrors.health() };
  }
}

module.exports = StreamedProvider;
