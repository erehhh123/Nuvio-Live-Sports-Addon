const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const manifest = require('./manifest');
const Cache = require('./services/Cache');
const Aggregator = require('./services/Aggregator');
const StreamedProvider = require('./providers/StreamedProvider');
const PpvMetadataProvider = require('./providers/PpvMetadataProvider');
const AuthorizedJsonProvider = require('./providers/AuthorizedJsonProvider');
const { posterFallback } = require('./utils/normalize');

const cache = new Cache(config.cacheTtlMs);
const providers = [];
if (config.streamed.enabled) providers.push(new StreamedProvider({
  cache,
  config: { ...config.streamed, timeoutMs: config.requestTimeoutMs }
}));
if (config.ppv.enabled) providers.push(new PpvMetadataProvider({
  cache,
  config: { ...config.ppv, timeoutMs: config.requestTimeoutMs }
}));
providers.push(new AuthorizedJsonProvider({
  cache,
  config: config.authorized,
  timeoutMs: config.requestTimeoutMs
}));
const aggregator = new Aggregator(providers);

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'public, max-age=20'
  });
  res.end(JSON.stringify(body));
}

function html(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(body);
}

function toMetaPreview(item) {
  return {
    id: item.id,
    type: 'tv',
    name: `${item.live ? '🔴 ' : ''}${item.title}`,
    poster: item.poster || posterFallback(item.category),
    posterShape: 'poster',
    description: item.description,
    genres: [item.category, item.league, item.providerName].filter(Boolean),
    releaseInfo: item.startTime ? new Date(item.startTime).toISOString() : undefined
  };
}

function toMeta(item) {
  return {
    ...toMetaPreview(item),
    background: item.poster,
    description: [
      item.description,
      `Provider: ${item.providerName}`,
      item.startTime ? `Start: ${new Date(item.startTime).toISOString()}` : null,
      item.is24_7 ? '24/7 channel listing' : null,
      Number.isFinite(item.sourceCount) ? `Listed sources: ${item.sourceCount}` : null
    ].filter(Boolean).join('\n')
  };
}

function parseExtra(text) {
  if (!text) return {};
  const params = new URLSearchParams(text);
  return Object.fromEntries(params.entries());
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS' });
      return res.end();
    }

    if (url.pathname === '/' || url.pathname === '/configure') {
      const file = path.join(__dirname, '..', 'public', 'configure.html');
      return html(res, 200, fs.readFileSync(file, 'utf8'));
    }
    if (url.pathname === '/manifest.json') return json(res, 200, manifest);
    if (url.pathname === '/health') {
      return json(res, 200, { ok: true, version: manifest.version, stats: await aggregator.stats(), providers: await aggregator.health() });
    }
    if (url.pathname === '/debug/feed.json') {
      const items = await aggregator.catalog('nuvio_sports_today');
      return json(res, 200, { stats: await aggregator.stats(), metas: items.map(toMetaPreview) });
    }

    let m = /^\/catalog\/tv\/([^/]+)(?:\/([^/]+))?\.json$/.exec(url.pathname);
    if (m) {
      const catalogId = decodeURIComponent(m[1]);
      const extra = { ...parseExtra(m[2]), ...Object.fromEntries(url.searchParams.entries()) };
      const items = await aggregator.catalog(catalogId, extra);
      return json(res, 200, { metas: items.map(toMetaPreview) });
    }

    m = /^\/meta\/tv\/(.+)\.json$/.exec(url.pathname);
    if (m) {
      const item = await aggregator.item(decodeURIComponent(m[1]));
      return item ? json(res, 200, { meta: toMeta(item) }) : json(res, 404, { meta: null });
    }

    m = /^\/stream\/tv\/(.+)\.json$/.exec(url.pathname);
    if (m) {
      const streams = await aggregator.streams(decodeURIComponent(m[1]));
      return json(res, 200, { streams });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: err.message || 'Internal server error' });
  }
});

server.listen(config.port, '0.0.0.0', () => {
  const base = config.publicBaseUrl || `http://localhost:${config.port}`;
  console.log(`Live Sports Hub listening on ${base}`);
  console.log(`Install manifest: ${base.replace(/\/$/, '')}/manifest.json`);
});

module.exports = { server, aggregator };
