function makeId(provider, id) {
  return `ls:${provider}:${encodeURIComponent(String(id))}`;
}

function parseId(value) {
  const match = /^ls:([^:]+):(.+)$/.exec(value || '');
  if (!match) return null;
  return { provider: match[1], id: decodeURIComponent(match[2]) };
}

module.exports = { makeId, parseId };
