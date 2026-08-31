function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function looksLikeDirectMedia(value, hint = '') {
  if (!isHttpUrl(value)) return false;
  const url = String(value).toLowerCase();
  const h = String(hint || '').toLowerCase();
  if (/\.(m3u8|mpd|ism)(?:$|[?#])/i.test(url)) return true;
  if (url.includes('/manifest.mpd') || url.includes('/master.m3u8') || url.includes('/index.m3u8')) return true;
  if (/(hls|dash|mpegurl|application\/dash)/i.test(h)) return true;
  return false;
}

function firstDirectMediaUrl(obj) {
  if (!obj || typeof obj !== 'object') return '';

  const hintedType = obj.type || obj.protocol || obj.mimeType || obj.format || '';
  const candidates = [
    ['url', obj.url],
    ['hls', obj.hls],
    ['hlsUrl', obj.hlsUrl],
    ['streamUrl', obj.streamUrl],
    ['stream_url', obj.stream_url],
    ['playlist', obj.playlist],
    ['manifest', obj.manifest],
    ['manifestUrl', obj.manifestUrl],
    ['file', obj.file],
    ['src', obj.src],
    ['dash', obj.dash],
    ['dashUrl', obj.dashUrl]
  ];

  for (const [key, value] of candidates) {
    const hint = `${key} ${hintedType}`;
    if (looksLikeDirectMedia(value, hint)) return value;
  }
  return '';
}

function firstExternalUrl(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const candidates = [obj.externalUrl, obj.embedUrl, obj.watchUrl, obj.pageUrl, obj.link];
  for (const value of candidates) {
    if (isHttpUrl(value)) return value;
  }
  if (isHttpUrl(obj.url) && !firstDirectMediaUrl(obj)) return obj.url;
  return '';
}

module.exports = { isHttpUrl, looksLikeDirectMedia, firstDirectMediaUrl, firstExternalUrl };
