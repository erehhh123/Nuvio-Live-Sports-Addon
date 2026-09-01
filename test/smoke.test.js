const test = require('node:test');
const assert = require('node:assert/strict');
const Cache = require('../src/services/Cache');
const Aggregator = require('../src/services/Aggregator');
const AuthorizedJsonProvider = require('../src/providers/AuthorizedJsonProvider');
const TestHlsProvider = require('../src/providers/TestHlsProvider');
const RoxiePlaybackProvider = require('../src/providers/RoxiePlaybackProvider');
const { makeId, parseId } = require('../src/utils/ids');
const { firstDirectMediaUrl, firstExternalUrl } = require('../src/utils/media');
const { findBestMapping } = require('../src/services/EventMatcher');
const { normalizeStream, dedupeAndSort } = require('../src/streams');

const cache = new Cache(1000);

test('IDs round-trip', () => {
  const id = makeId('authorized', 'abc/123');
  assert.deepEqual(parseId(id), { provider: 'authorized', id: 'abc/123' });
});

test('event-only catalogs hide 24/7 channels', async () => {
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
  const today = await agg.catalog('nuvio_sports_today');
  assert.equal(today.length, 0);
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

test('event matcher maps PPV title to configured Roxie event', () => {
  const item = { sourceId: '42', title: 'Monday Night Raw Live Stream', category: 'wrestling' };
  const result = findBestMapping(item, [
    { match: 'Monday Night Raw', aliases: ['WWE Raw'], category: 'wrestling' }
  ]);
  assert.ok(result);
  assert.equal(result.mapping.match, 'Monday Night Raw');
});

test('Roxie playback returns native direct stream and web fallback', async () => {
  const provider = new RoxiePlaybackProvider({
    config: {
      enabled: true,
      baseUrl: 'https://roxiestreams.info',
      eventMap: [{
        match: 'Monday Night Raw',
        category: 'wrestling',
        directUrls: [{ title: 'Direct HLS', url: 'https://media.example/wwe/master.m3u8' }],
        webUrl: '/wwe-raw'
      }]
    }
  });

  const streams = await provider.getStreamsForEvent({
    sourceId: '42',
    title: 'Monday Night Raw Live Stream',
    category: 'wrestling'
  });

  assert.equal(streams.length, 2);
  assert.equal(streams[0].url, 'https://media.example/wwe/master.m3u8');
  assert.equal(streams[1].externalUrl, 'https://roxiestreams.info/wwe-raw');
});

test('stream pipeline sorts native playback ahead of browser fallback', () => {
  const native = normalizeStream({ name: 'Direct', title: '1080p', url: 'https://media.example/live.m3u8' }, 0);
  const web = normalizeStream({ name: 'Web', title: 'Live', externalUrl: 'https://player.example/watch' }, 1);
  const sorted = dedupeAndSort([web, native]);
  assert.equal(sorted.length, 2);
  assert.equal(sorted[0].url, 'https://media.example/live.m3u8');
  assert.equal(sorted[1].externalUrl, 'https://player.example/watch');
});
