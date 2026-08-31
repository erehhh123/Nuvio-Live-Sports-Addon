const CATEGORY_MAP = new Map([
  ['soccer', 'football'],
  ['association football', 'football'],
  ['american-football', 'american football'],
  ['formula 1', 'motorsport'],
  ['f1', 'motorsport'],
  ['ufc', 'mma']
]);

function normalizeCategory(value) {
  const text = String(value || 'other').trim().toLowerCase();
  return CATEGORY_MAP.get(text) || text || 'other';
}

function isTwentyFourSeven(item) {
  const haystack = [item.category, item.tag, item.league, item.title, item.name]
    .filter(Boolean).join(' ').toLowerCase();
  return /24\s*\/\s*7|24x7|channel|network|sports tv|television/.test(haystack) || !item.startTime;
}

function isProbablyLive(startTime, explicitLive) {
  if (explicitLive === true) return true;
  if (!startTime) return false;
  const t = Number(startTime);
  if (!Number.isFinite(t)) return false;
  const delta = Date.now() - t;
  return delta >= -15 * 60_000 && delta <= 6 * 60 * 60_000;
}

function posterFallback(category = 'sports') {
  const label = encodeURIComponent(String(category).toUpperCase());
  return `https://placehold.co/600x900/111827/ffffff?text=${label}`;
}

module.exports = { normalizeCategory, isTwentyFourSeven, isProbablyLive, posterFallback };
