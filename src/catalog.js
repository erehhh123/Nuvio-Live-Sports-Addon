const { posterFallback } = require('./utils/normalize');

function toMetaPreview(item) {
  const poster = item.poster || posterFallback(item.category);
  const releaseInfo = item.live
    ? (item.is24_7 ? '24/7' : 'LIVE')
    : (item.startTime ? new Date(item.startTime).toISOString() : undefined);

  return {
    id: item.id,
    type: 'tv',
    name: `${item.live ? '🔴 ' : ''}${item.title}`,
    poster,
    posterShape: 'landscape',
    background: poster,
    description: item.description || `${item.providerName || 'Sports'} live event`,
    genres: [item.category, item.league, item.providerName].filter(Boolean),
    releaseInfo,
    behaviorHints: {
      defaultVideoId: item.id
    }
  };
}

function toMeta(item) {
  const preview = toMetaPreview(item);
  const released = item.startTime
    ? new Date(item.startTime).toISOString()
    : new Date(0).toISOString();

  return {
    ...preview,
    description: [
      item.description,
      item.providerName ? `Provider: ${item.providerName}` : null,
      item.startTime ? `Start: ${new Date(item.startTime).toISOString()}` : null,
      item.is24_7 ? '24/7 channel listing' : null,
      Number.isFinite(item.sourceCount) ? `Listed sources: ${item.sourceCount}` : null
    ].filter(Boolean).join('\n'),
    videos: [{
      id: item.id,
      title: item.title,
      released,
      season: 1,
      episode: 1
    }],
    behaviorHints: {
      defaultVideoId: item.id
    }
  };
}

async function handleCatalog(aggregator, type, id, extra = {}) {
  if (type !== 'tv' || !id.startsWith('nuvio_sports_')) return { metas: [] };
  const items = await aggregator.catalog(id, extra || {});
  return {
    metas: items.map(toMetaPreview),
    cacheMaxAge: 20,
    staleRevalidate: 30,
    staleError: 120
  };
}

async function handleMeta(aggregator, type, id) {
  if (type !== 'tv' || !id.startsWith('nuvio_sport_')) return { meta: null };
  const item = await aggregator.item(id);
  return { meta: item ? toMeta(item) : null };
}

module.exports = { toMetaPreview, toMeta, handleCatalog, handleMeta };
