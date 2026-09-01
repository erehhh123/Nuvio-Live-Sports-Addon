const BaseProvider = require('./BaseProvider');
const { makeId } = require('../utils/ids');
const { normalizeCategory, isTwentyFourSeven, isProbablyLive, posterFallback } = require('../utils/normalize');
const { MirrorManager } = require('../services/MirrorManager');

class PpvMetadataProvider extends BaseProvider {
  constructor({ cache, config, playbackProvider = null }) {
    super({ cache });
    this.id = 'ppv';
    this.name = 'PPV';
    this.feedPath = config.feedPath || '/api/streams';
    this.playbackProvider = playbackProvider;
    this.mirrors = new MirrorManager({
      name: 'ppv-api',
      bases: config.apiBases,
      timeoutMs: config.timeoutMs,
      cache
    });
  }

  async getItems() {
    return this.cache.remember('provider:ppv:items:v5', async () => {
      const { value: data } = await this.mirrors.requestJson(this.feedPath, {
        headers: { accept: 'application/json' }
      });

      const groups = normalizeGroups(data);
      const out = [];
      for (const group of groups) {
        const category = normalizeCategory(group.category || group.name || 'other');
        for (const raw of Array.isArray(group.streams) ? group.streams : []) {
          if (!raw || raw.id == null) continue;
          const startTime = toMillis(raw.starts_at ?? raw.startTime ?? raw.date);
          const base = {
            title: raw.name || raw.title || `Sports event ${raw.id}`,
            category,
            tag: raw.tag || raw.league,
            startTime
          };
          out.push({
            id: makeId(this.id, raw.id),
            provider: this.id,
            providerName: this.name,
            sourceId: String(raw.id),
            title: base.title,
            category,
            league: base.tag || category,
            startTime,
            live: Boolean(raw.live) || isProbablyLive(startTime, false),
            is24_7: Boolean(raw.is24_7) || isTwentyFourSeven(base),
            poster: raw.poster || raw.image || posterFallback(category),
            description: `${base.tag || category} event from the configured PPV metadata feed.`,
            viewers: Number.parseInt(raw.viewers || '0', 10) || 0,
            metadata: raw
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

  async getStreams(sourceId) {
    const item = await this.getItem(sourceId);
    if (!item || !this.playbackProvider) return [];
    return this.playbackProvider.getStreamsForEvent(item);
  }

  async health() {
    return {
      provider: this.id,
      role: 'metadata',
      feedPath: this.feedPath,
      mirrors: await this.mirrors.health(),
      playback: this.playbackProvider ? await this.playbackProvider.health() : null
    };
  }
}

function normalizeGroups(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (data.every(x => !x || !Array.isArray(x.streams))) return [{ category: 'other', streams: data }];
    return data;
  }
  if (Array.isArray(data.streams)) {
    if (data.streams.some(x => x && Array.isArray(x.streams))) return data.streams;
    return [{ category: data.category || 'other', streams: data.streams }];
  }
  if (Array.isArray(data.items)) return [{ category: data.category || 'other', streams: data.items }];
  return [];
}

function toMillis(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n < 10_000_000_000 ? n * 1000 : n;
}

module.exports = PpvMetadataProvider;
