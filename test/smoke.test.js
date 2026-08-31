const test = require('node:test');
const assert = require('node:assert/strict');
const Cache = require('../src/services/Cache');
const Aggregator = require('../src/services/Aggregator');
const AuthorizedJsonProvider = require('../src/providers/AuthorizedJsonProvider');
const TestHlsProvider = require('../src/providers/TestHlsProvider');
const { makeId, parseId } = require('../src/utils/ids');
const { firstDirectMediaUrl, firstExternalUrl } = require('../src/utils/media');
const { normalizeStream, dedupeAndSort } = require('../src/streams');

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

test('public HLS playback-test provider appears and returns a stream', async () => {
  const provider = new TestHlsProvider({ cache, enabled: true });
  const agg = new Aggregator([provider]);
  const items = await agg.catalog('nuvio_sports_test');
  assert.equal(items.length, 1);
  assert.equal(items[0].provider, 'test');
  const streams = await agg.streams(items[0].id);
  assert.equal(streams.length, 1);
  assert.match(streams[0].url, /^https:\/\/devstreaming-cdn\.apple\.com\//);
});

test('direct media detector prefers HLS over embed page', () => {
  const candidate = {
    hlsUrl: 'https://media.example/live/master.m3u8?token=abc',
    embedUrl: 'https://player.example/embed/123'
  };
  assert.equal(firstDirectMediaUrl(candidate), candidate.hlsUrl);
  assert.equal(firstExternalUrl(candidate), candidate.embedUrl);
});

test('stream pipeline sorts native playback ahead of browser fallback', () => {
  const native = normalizeStream({ name: 'Direct', title: '1080p', url: 'https://media.example/live.m3u8' }, 0);
  const web = normalizeStream({ name: 'Web', title: 'Live', externalUrl: 'https://player.example/watch' }, 1);
  const sorted = dedupeAndSort([web, native]);
  assert.equal(sorted.length, 2);
  assert.equal(sorted[0].url, 'https://media.example/live.m3u8');
  assert.equal(sorted[1].externalUrl, 'https://player.example/watch');
});
