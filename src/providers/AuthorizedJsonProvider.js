const BaseProvider = require('./BaseProvider');
const { fetchJson } = require('../utils/http');
const { makeId } = require('../utils/ids');
const { normalizeCategory, isTwentyFourSeven, isProbablyLive, posterFallback } = require('../utils/normalize');

class AuthorizedJsonProvider extends BaseProvider {
  constructor({ cache, config, timeoutMs }) {
    super({ cache });
    this.id = 'authorized';
    this.name = 'Authorized Feed';
    this.feedUrl = config.feedUrl;
    this.bearerToken = config.bearerToken;
    this.channels = Array.isArray(config.channels) ? config.channels : [];
    this.timeoutMs = timeoutMs;
  }

  headers() {
    return this.bearerToken ? { authorization: `Bearer ${this.bearerToken}` } : {};
  }

  async remoteItems() {
    if (!this.feedUrl) return [];
    const data = await fetchJson(this.feedUrl, { headers: this.headers() }, this.timeoutMs);
    return Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
  }

  async getItems() {
    return this.cache.remember('provider:authorized:items', async () => {
      let remote = [];
      try { remote = await this.remoteItems(); }
      catch (err) { console.warn(`[authorized] feed failed: ${err.message}`); }
      return [...remote, ...this.channels].map(raw => this.normalize(raw)).filter(Boolean);
    });
  }

  normalize(raw) {
    if (!raw || raw.id == null || !raw.title) return null;
    const category = normalizeCategory(raw.category || raw.sport || 'sports');
    const startTime = raw.startTime ? Number(raw.startTime) : (raw.date ? Number(raw.date) : null);
    return {
      id: makeId(this.id, raw.id),
      provider: this.id,
      providerName: this.name,
      sourceId: String(raw.id),
      title: String(raw.title),
      category,
      league: raw.league || category,
      startTime: Number.isFinite(startTime) ? startTime : null,
      live: isProbablyLive(startTime, raw.live),
      is24_7: raw.is24_7 === true || isTwentyFourSeven({ ...raw, startTime }),
      poster: raw.poster || posterFallback(category),
      description: raw.description || `${raw.league || category} — authorized source`,
      streams: Array.isArray(raw.streams) ? raw.streams : (raw.url ? [{ url: raw.url, title: raw.quality || 'Live' }] : [])
    };
  }

  async getItem(sourceId) {
    const items = await this.getItems();
    return items.find(x => x.sourceId === String(sourceId)) || null;
  }

  async getStreams(sourceId) {
    const item = await this.getItem(sourceId);
    if (!item) return [];
    return item.streams
      .filter(s => s && typeof s.url === 'string' && /^https?:\/\//i.test(s.url))
      .map((s, i) => ({
        name: s.name || 'Authorized',
        title: s.title || s.quality || `Source ${i + 1}`,
        url: s.url,
        behaviorHints: s.headers ? { proxyHeaders: { request: s.headers } } : undefined
      }));
  }

  async health() {
    return { provider: this.id, configured: Boolean(this.feedUrl || this.channels.length), ok: true };
  }
}

module.exports = AuthorizedJsonProvider;
