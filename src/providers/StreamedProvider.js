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

  async optionalRequest(path) {
    try {
      const result = await this.mirrors.requestJson(path);
      return { ok: true, ...result };
    } catch (error) {
      console.warn(`[streamed] ${path} failed: ${error.message}`);
      return { ok: false, error };
    }
  }

  async getItems() {
    return this.cache.remember('provider:streamed:items:v2', async () => {
      // Do not make the whole catalog disappear just because one endpoint is flaky.
      const [liveResult, todayResult] = await Promise.all([
        this.optionalRequest('/api/matches/live'),
        this.optionalRequest('/api/matches/all-today')
      ]);

      let live = liveResult.ok && Array.isArray(liveResult.value) ? liveResult.value : [];
      let today = todayResult.ok && Array.isArray(todayResult.value) ? todayResult.value : [];
      let posterBase = todayResult.base || liveResult.base || this.config.bases[0];

      // Last-resort discovery fallback: if both focused feeds fail, use the all feed.
      if (!live.length && !today.length) {
        const allResult = await this.optionalRequest('/api/matches/all');
        if (allResult.ok && Array.isArray(allResult.value)) {
          today = allResult.value;
          posterBase = allResult.base || posterBase;
        }
      }

      const liveIds = new Set(live.map(x => String(x.id)));
      const merged = new Map();
      for (const raw of [...live, ...today]) {
        if (!raw || raw.id == null) continue;
        merged.set(String(raw.id), this.normalize(raw, posterBase, liveIds.has(String(raw.id))));
      }

      return [...merged.values()].sort((a, b) => {
        if (a.live !== b.live) return a.live ? -1 : 1;
        return (a.startTime || Number.MAX_SAFE_INTEGER) - (b.startTime || Number.MAX_SAFE_INTEGER);
      });
    });
  }

  normalize(raw, base, explicitLive) {
    const category = normalizeCategory(raw.category);
    const poster = normalizePoster(raw.poster, base) || posterFallback(category);
    const startTime = Number(raw.date) || null;
    return {
      id: makeId(this.id, raw.id),
      provider: this.id,
      providerName: this.name,
      sourceId: String(raw.id),
      title: raw.title || `Sports event ${raw.id}`,
      category,
      league: category,
      startTime,
      live: isProbablyLive(startTime, explicitLive),
      is24_7: false,
      poster,
      description: `${category} event from Streamed's public match feed.`,
      sourceCount: Array.isArray(raw.sources) ? raw.sources.length : 0,
      rawSources: Array.isArray(raw.sources) ? raw.sources : []
    };
  }

  async getItem(sourceId) {
    const items = await this.getItems();
    return items.find(x => x.sourceId === String(sourceId)) || null;
  }

  // Event discovery is intentionally separate from playback. This keeps the live feed
  // visible in Nuvio even when no authorized playback source is configured.
  async getStreams() { return []; }

  async health() {
    return { provider: this.id, mirrors: await this.mirrors.health() };
  }
}

function normalizePoster(value, base) {
  if (!value) return '';
  const raw = String(value);
  if (/^https?:\/\//i.test(raw)) return raw;
  const suffix = raw.endsWith('.webp') ? raw : `${raw}.webp`;
  try {
    return new URL(suffix, `${String(base || '').replace(/\/+$/, '')}/`).toString();
  } catch {
    return '';
  }
}

module.exports = StreamedProvider;
