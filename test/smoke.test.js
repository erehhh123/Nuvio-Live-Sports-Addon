const test = require('node:test');
const assert = require('node:assert/strict');
const Cache = require('../src/services/Cache');
const Aggregator = require('../src/services/Aggregator');
const AuthorizedJsonProvider = require('../src/providers/AuthorizedJsonProvider');
const { makeId, parseId } = require('../src/utils/ids');

const cache = new Cache(1000);

test('IDs round-trip', () => {
  const id = makeId('authorized', 'abc/123');
  assert.deepEqual(parseId(id), { provider: 'authorized', id: 'abc/123' });
});

test('authorized 24/7 channel appears and returns stream', async () => {
  const provider = new AuthorizedJsonProvider({
    cache,
    timeoutMs: 100,
    config: {
      feedUrl: '', bearerToken: '', channels: [
        { id: 'demo', title: 'Demo Sports Channel', category: '24/7', is24_7: true, url: 'https://example.com/live.m3u8' }
      ]
    }
  });
  const agg = new Aggregator([provider]);
  const channels = await agg.catalog('nuvio_sports_networks');
  assert.equal(channels.length, 1);
  const streams = await agg.streams(channels[0].id);
  assert.equal(streams[0].url, 'https://example.com/live.m3u8');
});

test('today feed displays discovered events even when they have no playback streams', async () => {
  const now = Date.now();
  const metadataOnly = {
    id: 'metadata',
    async getItems() {
      return [{
        id: makeId('metadata', 'event-1'), provider: 'metadata', providerName: 'Metadata Feed', sourceId: 'event-1',
        title: 'Team A vs Team B', category: 'football', league: 'football', startTime: now,
        live: true, is24_7: false, poster: 'https://example.com/poster.jpg'
      }];
    },
    async getItem(id) { return id === 'event-1' ? (await this.getItems())[0] : null; },
    async getStreams() { return []; },
    async health() { return { provider: 'metadata', ok: true }; }
  };
  const agg = new Aggregator([metadataOnly]);
  const feed = await agg.catalog('nuvio_sports_today');
  assert.equal(feed.length, 1);
  assert.equal(feed[0].title, 'Team A vs Team B');
  assert.deepEqual(await agg.streams(feed[0].id), []);
});
