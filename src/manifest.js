module.exports = {
  id: 'community.nuvio.live-sports.safe-starter',
  version: '1.3.0',
  name: '🏟️ Live Sports Hub',
  description: 'Live sports feeds for Nuvio/Stremio with resilient event discovery, provider failover, and optional authorized playback.',
  types: ['tv'],
  resources: ['catalog', 'meta', 'stream'],
  idPrefixes: ['nuvio_sport_'],
  catalogs: [
    { type: 'tv', id: 'nuvio_sports_test', name: '🧪 Playback Test', extra: [] },
    { type: 'tv', id: 'nuvio_sports_live', name: '🔴 Live Now', extra: [{ name: 'search', isRequired: false }] },
    { type: 'tv', id: 'nuvio_sports_today', name: '📅 Today’s Sports', extra: [{ name: 'search', isRequired: false }] },
    { type: 'tv', id: 'nuvio_sports_networks', name: '📺 24/7 Sports TV', extra: [{ name: 'search', isRequired: false }] },
    { type: 'tv', id: 'nuvio_sports_football', name: '⚽ Football', extra: [{ name: 'search', isRequired: false }] },
    { type: 'tv', id: 'nuvio_sports_basketball', name: '🏀 Basketball', extra: [{ name: 'search', isRequired: false }] },
    { type: 'tv', id: 'nuvio_sports_combat', name: '🥊 MMA & Boxing', extra: [{ name: 'search', isRequired: false }] },
    { type: 'tv', id: 'nuvio_sports_motorsport', name: '🏎️ Motorsport', extra: [{ name: 'search', isRequired: false }] },
    { type: 'tv', id: 'nuvio_sports_other', name: '🏅 Other Sports', extra: [{ name: 'search', isRequired: false }] },
    { type: 'tv', id: 'nuvio_sports_upcoming', name: '⏱️ Upcoming', extra: [{ name: 'search', isRequired: false }] }
  ],
  behaviorHints: { adult: false, p2p: false, configurable: false }
};
