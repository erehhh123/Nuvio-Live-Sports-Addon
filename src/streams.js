function normalizeStream(stream, index) {
  if (!stream || typeof stream !== 'object') return null;

  const out = {
    name: stream.name || 'Live Sports',
    title: stream.title || stream.quality || `Source ${index + 1}`
  };

  if (typeof stream.url === 'string' && /^https?:\/\//i.test(stream.url)) {
    out.url = stream.url;
  } else if (typeof stream.externalUrl === 'string' && /^https?:\/\//i.test(stream.externalUrl)) {
    out.externalUrl = stream.externalUrl;
  } else {
    return null;
  }

  if (stream.behaviorHints && typeof stream.behaviorHints === 'object') {
    out.behaviorHints = stream.behaviorHints;
  } else if (stream.headers && typeof stream.headers === 'object') {
    out.behaviorHints = {
      proxyHeaders: { request: stream.headers }
    };
  }

  return out;
}

async function handleStream(aggregator, type, id) {
  if (type !== 'tv' || !id.startsWith('nuvio_sport_')) return { streams: [] };

  const raw = await aggregator.streams(id);
  const streams = (Array.isArray(raw) ? raw : [])
    .map(normalizeStream)
    .filter(Boolean);

  return {
    streams,
    cacheMaxAge: 20,
    staleRevalidate: 30,
    staleError: 120
  };
}

module.exports = { handleStream, normalizeStream };
