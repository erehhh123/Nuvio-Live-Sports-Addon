function boolEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
}

function intEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) ? value : fallback;
}

function listEnv(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(',').map(v => v.trim()).filter(Boolean);
}

function jsonEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

module.exports = {
  port: intEnv('PORT', 7000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
  requestTimeoutMs: intEnv('REQUEST_TIMEOUT_MS', 7000),
  cacheTtlMs: intEnv('CACHE_TTL_SECONDS', 60) * 1000,
  testProviderEnabled: boolEnv('TEST_PROVIDER_ENABLED', true),

  streamed: {
    enabled: boolEnv('STREAMED_ENABLED', true),
    bases: listEnv('STREAMED_BASES', ['https://streamed.pk', 'https://streamed.st']),
    discoverOfficialMirrors: boolEnv('STREAMED_DISCOVER_OFFICIAL_MIRRORS', true),
    mirrorIndex: process.env.STREAMED_MIRROR_INDEX || 'https://strmd.link/'
  },

  roxie: {
    enabled: boolEnv('ROXIE_ENABLED', true),
    baseUrl: process.env.ROXIE_BASE_URL || 'https://roxiestreams.su',
    eventMap: jsonEnv('ROXIE_EVENT_MAP_JSON', [])
  },

  authorized: {
    feedUrl: process.env.AUTHORIZED_FEED_URL || '',
    bearerToken: process.env.AUTHORIZED_FEED_BEARER_TOKEN || '',
    channels: jsonEnv('AUTHORIZED_CHANNELS_JSON', [])
  }
};
