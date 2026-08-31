function encodePart(value) {
  return Buffer.from(String(value), 'utf8').toString('base64url');
}

function decodePart(value) {
  try {
    return Buffer.from(String(value), 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function makeId(provider, id) {
  return `nuvio_sport_${encodePart(provider)}_${encodePart(id)}`;
}

function parseId(value) {
  const match = /^nuvio_sport_([^_]+)_([^_]+)$/.exec(value || '');
  if (!match) return null;
  const provider = decodePart(match[1]);
  const id = decodePart(match[2]);
  if (!provider || id == null) return null;
  return { provider, id };
}

module.exports = { makeId, parseId };
