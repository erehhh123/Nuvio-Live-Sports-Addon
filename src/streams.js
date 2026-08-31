const StreamEntity = require('./domain/StreamEntity');
const StreamScoringService = require('./services/StreamScoringService');
const { isHttpUrl } = require('./utils/media');

const streamScorer = new StreamScoringService();

function normalizeStream(stream, index) {
  if (!stream || typeof stream !== 'object') return null;

  const url = isHttpUrl(stream.url) ? stream.url : undefined;
  const externalUrl = !url && isHttpUrl(stream.externalUrl) ? stream.externalUrl : undefined;
  if (!url && !externalUrl) return null;

  const entity = new StreamEntity({
    name: stream.name || 'Live Sports Hub',
    title: stream.title || stream.quality || `Source ${index + 1}`,
    url,
    externalUrl,
    resolution: stream.resolution || stream.quality || null,
    bitrate: stream.bitrate || null,
    behaviorHints: stream.behaviorHints || (stream.headers ? {
      proxyHeaders: { request: stream.headers }
    } : undefined)
  });

  entity.score = streamScorer.calculateScore(entity, stream.sourceName || stream.name || '');
  return entity;
}

function dedupeAndSort(streams) {
  const unique = new Map();
  for (const stream of streams) {
    const key = stream.url || stream.externalUrl;
    if (!key) continue;
    const previous = unique.get(key);
    if (!previous || stream.score > previous.score) unique.set(key, stream);
  }

  return [...unique.values()]
    .sort((a, b) => b.score - a.score)
    .map(stream => {
      const out = {
        name: stream.name,
        title: stream.title
      };
      if (stream.url) out.url = stream.url;
      if (stream.externalUrl) out.externalUrl = stream.externalUrl;
      if (stream.behaviorHints) out.behaviorHints = stream.behaviorHints;
      return out;
    });
}

async function handleStream(aggregator, type, id) {
  if (type !== 'tv' || !id.startsWith('nuvio_sport_')) return { streams: [] };

  const raw = await aggregator.streams(id);
  const normalized = (Array.isArray(raw) ? raw : [])
    .map(normalizeStream)
    .filter(Boolean);

  return {
    streams: dedupeAndSort(normalized),
    cacheMaxAge: 20,
    staleRevalidate: 30,
    staleError: 120
  };
}

module.exports = { handleStream, normalizeStream, dedupeAndSort };
