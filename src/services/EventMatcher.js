function normalizeEventText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(live|stream|streams|watch|online|hd)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenSimilarity(a, b) {
  const left = new Set(normalizeEventText(a).split(' ').filter(Boolean));
  const right = new Set(normalizeEventText(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;

  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / new Set([...left, ...right]).size;
}

function scoreText(a, b) {
  const left = normalizeEventText(a);
  const right = normalizeEventText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.92;
  return tokenSimilarity(left, right);
}

function mappingScore(item, mapping) {
  if (!item || !mapping) return 0;

  if (mapping.sourceId != null && String(mapping.sourceId) === String(item.sourceId)) return 1.1;
  if (mapping.id != null && String(mapping.id) === String(item.sourceId)) return 1.1;

  if (mapping.category && normalizeEventText(mapping.category) !== normalizeEventText(item.category)) {
    return 0;
  }

  const candidates = [mapping.match, mapping.title]
    .concat(Array.isArray(mapping.aliases) ? mapping.aliases : [])
    .filter(Boolean);

  let best = 0;
  for (const candidate of candidates) {
    best = Math.max(best, scoreText(item.title, candidate));
  }
  return best;
}

function findBestMapping(item, mappings, minScore = 0.55) {
  let best = null;
  let bestScore = 0;

  for (const mapping of Array.isArray(mappings) ? mappings : []) {
    const score = mappingScore(item, mapping);
    if (score > bestScore) {
      best = mapping;
      bestScore = score;
    }
  }

  return best && bestScore >= minScore ? { mapping: best, score: bestScore } : null;
}

module.exports = { normalizeEventText, tokenSimilarity, mappingScore, findBestMapping };
