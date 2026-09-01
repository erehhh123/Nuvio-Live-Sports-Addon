const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { getRouter } = require('stremio-addon-sdk');

const config = require('./config');
const { manifest, builder } = require('./manifest');
const Cache = require('./services/Cache');
const Aggregator = require('./services/Aggregator');
const PpvMetadataProvider = require('./providers/PpvMetadataProvider');
const RoxiePlaybackProvider = require('./providers/RoxiePlaybackProvider');
const AuthorizedJsonProvider = require('./providers/AuthorizedJsonProvider');
const TestHlsProvider = require('./providers/TestHlsProvider');
const { makeId } = require('./utils/ids');
const { toMeta, toMetaPreview, handleCatalog, handleMeta } = require('./catalog');
const { handleStream } = require('./streams');

const cache = new Cache(config.cacheTtlMs);
const providers = [];

if (config.testProviderEnabled) {
  providers.push(new TestHlsProvider({ cache, enabled: true }));
}

const roxiePlayback = new RoxiePlaybackProvider({ config: config.roxie });

if (config.ppv.enabled) {
  providers.push(new PpvMetadataProvider({
    cache,
    config: { ...config.ppv, timeoutMs: config.requestTimeoutMs },
    playbackProvider: roxiePlayback
  }));
}

providers.push(new AuthorizedJsonProvider({
  cache,
  config: config.authorized,
  timeoutMs: config.requestTimeoutMs
}));

const aggregator = new Aggregator(providers);

builder.defineCatalogHandler(({ type, id, extra }) =>
  handleCatalog(aggregator, type, id, extra)
);
builder.defineMetaHandler(({ type, id }) =>
  handleMeta(aggregator, type, id)
);
builder.defineStreamHandler(({ type, id }) =>
  handleStream(aggregator, type, id)
);

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><title>${manifest.name}</title></head>
<body style="font-family:sans-serif;max-width:760px;margin:40px auto;padding:0 20px">
<h1>${manifest.name}</h1>
<p>Version ${manifest.version}</p>
<p>PPV provides event metadata; Roxie mappings provide direct/web playback choices.</p>
<p>Install this addon with <code>${config.publicBaseUrl || ''}/manifest.json</code></p>
<p><a href="/manifest.json">manifest.json</a> · <a href="/health">health</a> · <a href="/debug/playback-test.json">playback test</a></p>
</body></html>`);
});

app.get('/configure', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'configure.html'));
});

app.get('/health', async (req, res) => {
  res.json({
    ok: true,
    version: manifest.version,
    sdk: true,
    stats: await aggregator.stats(),
    providers: await aggregator.health(),
    roxie: await roxiePlayback.health()
  });
});

app.get('/debug/feed.json', async (req, res) => {
  const items = await aggregator.catalog('nuvio_sports_today');
  res.json({ stats: await aggregator.stats(), metas: items.map(toMetaPreview) });
});

app.get('/debug/playback-test.json', async (req, res) => {
  const id = makeId('test', 'apple-bipbop');
  const item = await aggregator.item(id);
  const streamResponse = await handleStream(aggregator, 'tv', id);
  res.json({
    id,
    meta: item ? toMeta(item) : null,
    streamPath: `/stream/tv/${encodeURIComponent(id)}.json`,
    streams: streamResponse.streams
  });
});

app.use(getRouter(builder.getInterface()));

const server = app.listen(config.port, '0.0.0.0', () => {
  const base = (config.publicBaseUrl || `http://localhost:${config.port}`).replace(/\/$/, '');
  console.log(`${manifest.name} v${manifest.version} listening on ${base}`);
  console.log(`Install manifest: ${base}/manifest.json`);
});

module.exports = { app, server, aggregator, builder, roxiePlayback };
