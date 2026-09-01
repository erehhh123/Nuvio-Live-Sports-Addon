# 🏟️ Live Sports Hub — Nuvio / Stremio Addon

Event-only live sports addon for Nuvio/Stremio.

## Current architecture

```text
Streamed public match API
      ↓
Live / Today / sport / Upcoming catalogs
      ↓
Streamed event selected in Nuvio
      ↓
Roxie event mapping
      ├─ direct HLS/DASH URL → native Nuvio player
      └─ Roxie web URL      → browser fallback
```

Streamed is used only for schedules and event metadata. Its stream/embed API is not used for playback. Playback is delegated to `RoxiePlaybackProvider`.

PPV is not part of the active provider path in this version.

## Catalogs

- 🧪 Playback Test
- 🔴 Live Now
- 📅 Today’s Sports
- ⚽ Football
- 🏀 Basketball
- 🥊 MMA & Boxing
- 🏎️ Motorsport
- 🏅 Other Sports
- ⏱️ Upcoming

24/7 channels are intentionally filtered out.

## Roxie event mappings

Set `ROXIE_EVENT_MAP_JSON` to an array of mappings. A mapping can match the Streamed `sourceId`, event title, aliases, and optionally category.

Example title mapping:

```json
[
  {
    "match": "Monday Night Raw",
    "aliases": ["WWE Raw"],
    "category": "wrestling",
    "directUrls": [
      {
        "title": "Direct HLS",
        "url": "https://media.example/events/raw/master.m3u8"
      }
    ],
    "webUrl": "https://roxiestreams.info/example-event"
  }
]
```

For an exact Streamed event ID, use `sourceId`:

```json
[
  {
    "sourceId": "live-event_monday-night-raw-live-stream",
    "directUrl": "https://media.example/events/raw/index.m3u8",
    "webUrl": "/example-event"
  }
]
```

Relative `webUrl`/`webPath` values are resolved against `ROXIE_BASE_URL`.

Only normal HTTP(S) HLS/DASH-style direct media URLs supplied in the mapping are accepted for the native option. Use sources you are authorized to access and redistribute.

## Environment

```env
PORT=7000
CACHE_TTL_SECONDS=60
TEST_PROVIDER_ENABLED=true

STREAMED_ENABLED=true
STREAMED_BASES=https://streamed.pk,https://streamed.st
STREAMED_DISCOVER_OFFICIAL_MIRRORS=true
STREAMED_MIRROR_INDEX=https://strmd.link/

ROXIE_ENABLED=true
ROXIE_BASE_URL=https://roxiestreams.info
ROXIE_EVENT_MAP_JSON=[]
```

`ROXIE_EVENT_MAP_JSON=[]` means Streamed events still appear, but they return no Roxie playback choices until a mapping is configured.

## Run locally

```bash
npm install
npm start
```

Node 20+ is required.

Useful endpoints:

```text
GET /manifest.json
GET /catalog/tv/nuvio_sports_today.json
GET /catalog/tv/nuvio_sports_live.json
GET /meta/tv/:id.json
GET /stream/tv/:id.json
GET /debug/feed.json
GET /debug/playback-test.json
GET /health
```

## Install in Nuvio

After deployment, install:

```text
https://YOUR-HOST/manifest.json
```

Use **Addons**, not Plugins.

## Playback test

The 🧪 Playback Test catalog returns Apple’s public HLS developer stream. Use it to verify that Nuvio can discover the addon and play a normal `.m3u8` natively before debugging an event mapping.

## Tests

```bash
npm test
npm run check
```

## Optional authorized provider

`AuthorizedJsonProvider` remains available for direct HLS/DASH/HTTP sources you control. Event-only catalog filtering hides entries marked as 24/7 channels.
