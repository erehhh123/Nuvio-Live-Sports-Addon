const { isHttpUrl, looksLikeDirectMedia } = require('../utils/media');
const { findBestMapping } = require('../services/EventMatcher');

class RoxiePlaybackProvider {
  constructor({ config }) {
    this.id = 'roxie';
    this.name = 'RoxieStreams';
    this.enabled = config.enabled !== false;
    this.baseUrl = String(config.baseUrl || 'https://roxiestreams.info').replace(/\/$/, '');
    this.mappings = Array.isArray(config.eventMap) ? config.eventMap : [];
  }

  async getStreamsForEvent(item) {
    if (!this.enabled || !item) return [];

    const matched = findBestMapping(item, this.mappings);
    if (!matched) return [];

    const { mapping, score } = matched;
    const streams = [];
    const directEntries = [];

    if (mapping.directUrl) directEntries.push(mapping.directUrl);
    if (Array.isArray(mapping.directUrls)) directEntries.push(...mapping.directUrls);

    for (let i = 0; i < directEntries.length; i += 1) {
      const raw = directEntries[i];
      const entry = typeof raw === 'string' ? { url: raw } : raw;
      if (!entry || !looksLikeDirectMedia(entry.url, entry.type || entry.format || '')) continue;

      streams.push({
        name: 'Roxie',
        title: entry.title || entry.name || `Direct ${i + 1}`,
        url: entry.url,
        resolution: entry.resolution || entry.quality || null,
        sourceName: 'roxie-direct'
      });
    }

    const webUrl = resolveWebUrl(mapping.webUrl || mapping.watchUrl || mapping.pageUrl || mapping.webPath, this.baseUrl);
    if (webUrl) {
      streams.push({
        name: 'Roxie',
        title: 'Web Player',
        externalUrl: webUrl,
        sourceName: 'roxie-web'
      });
    }

    return streams.map(stream => ({ ...stream, matchScore: score }));
  }

  async health() {
    return {
      provider: this.id,
      enabled: this.enabled,
      baseUrl: this.baseUrl,
      configuredMappings: this.mappings.length
    };
  }
}

function resolveWebUrl(value, baseUrl) {
  if (!value) return '';
  if (isHttpUrl(value)) return value;
  if (typeof value !== 'string') return '';
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return '';
  }
}

module.exports = RoxiePlaybackProvider;
