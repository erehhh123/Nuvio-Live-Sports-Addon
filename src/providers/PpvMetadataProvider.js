const BaseProvider = require('./BaseProvider');
const { makeId } = require('../utils/ids');
const { normalizeCategory, isTwentyFourSeven, isProbablyLive, posterFallback } = require('../utils/normalize');
const { MirrorManager } = require('../services/MirrorManager');

class PpvMetadataProvider extends BaseProvider {
  constructor({ cache, config }) {
    super({ cache });
    this.id = 'ppv';
    this.name = 'PPV';
    this.mirrors = new MirrorManager({
      name: 'ppv-api',
      bases: config.apiBases,
      timeoutMs: config.timeoutMs,
      cache
    });
  }

  async getItems() {
    return this.cache.remember('provider:ppv:items', async () => {
      const { value: data } = await this.mirrors.requestJson('/api/streams', {
        headers: { 'accept': 'application/json' }
      });
      if (!data || data.success !== true || !Array.isArray(data.streams)) return [];
      const out = [];
      for (const group of data.streams) {
        const category = normalizeCategory(group.category);
        for (const raw of Array.isArray(group.streams) ? group.streams : []) {
          if (!raw || raw.id == null) continue;
          const startTime = raw.starts_at ? Number(raw.starts_at) * 1000 : null;
          const base = {
            title: raw.name || `Sports channel ${raw.id}`,
            category,
            tag: raw.tag,
            startTime
          };
          out.push({
            id: makeId(this.id, raw.id),
            provider: this.id,
            providerName: this.name,
            sourceId: String(raw.id),
            title: base.title,
            category,
            league: raw.tag || category,
            startTime,
            live: isProbablyLive(startTime, false),
            is24_7: isTwentyFourSeven(base),
            poster: raw.poster || posterFallback(category),
            description: `${raw.tag || category} listing from PPV metadata.`,
            viewers: Number.parseInt(raw.viewers || '0', 10) || 0
          });
        }
      }
      return out;
    });
  }

  async getItem(sourceId) {
    const items = await this.getItems();
    return items.find(x => x.sourceId === String(sourceId)) || null;
  }

  // Playback URLs/iframes returned by the upstream are deliberately not exposed here.
  async getStreams() { return []; }

  async health() {
    return { provider: this.id, mirrors: await this.mirrors.health() };
  }
}

module.exports = PpvMetadataProvider;
