const BaseProvider = require('./BaseProvider');
const { makeId } = require('../utils/ids');

// Public Apple HLS example stream intended for playback testing.
// Source documentation: https://developer.apple.com/streaming/examples/
const APPLE_BIPBOP = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8';

class TestHlsProvider extends BaseProvider {
  constructor({ cache, enabled = true }) {
    super({ cache });
    this.id = 'test';
    this.name = 'Playback Test';
    this.enabled = enabled;
  }

  item() {
    return {
      id: makeId(this.id, 'apple-bipbop'),
      provider: this.id,
      providerName: this.name,
      sourceId: 'apple-bipbop',
      title: 'Apple HLS Playback Test',
      category: 'test',
      league: 'HLS Test',
      startTime: null,
      live: true,
      is24_7: true,
      poster: 'https://placehold.co/600x900/111827/ffffff?text=HLS+TEST',
      description: 'Public Apple HLS example stream. Use this item to verify that Nuvio/Stremio can discover a provider and start playback.'
    };
  }

  async getItems() {
    return this.enabled ? [this.item()] : [];
  }

  async getItem(sourceId) {
    return this.enabled && String(sourceId) === 'apple-bipbop' ? this.item() : null;
  }

  async getStreams(sourceId) {
    if (!this.enabled || String(sourceId) !== 'apple-bipbop') return [];
    return [{
      name: 'Playback Test',
      title: 'Apple Bip Bop • HLS',
      url: APPLE_BIPBOP,
      behaviorHints: {
        notWebReady: false
      }
    }];
  }

  async health() {
    return { provider: this.id, configured: this.enabled, ok: this.enabled };
  }
}

module.exports = TestHlsProvider;
