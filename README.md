# 🏟️ Live Sports Hub — Nuvio / Stremio Addon Starter

A zero-dependency Node.js addon implementing the Stremio addon protocol for live sports catalogs.

## What is included

- `manifest.json` plus catalog/meta/stream routes compatible with Stremio-style clients.
- Live, upcoming, sport-category, and 24/7 channel catalogs.
- Streamed event metadata adapter using its published REST match API.
- Streamed official-mirror failover (`streamed.pk`, `streamed.st`) and optional discovery from `strmd.link`.
- PPV event/channel metadata adapter using configurable API bases.
- TTL caching and basic mirror health reporting.
- `AuthorizedJsonProvider` for direct HLS/HTTP streams you own or are allowed to redistribute.
- Render and Docker deployment files.

## Important playback boundary

The Streamed and PPV adapters in this starter intentionally **do not expose upstream embed/stream URLs**. They populate catalogs and metadata only. Direct playback is supplied by `AuthorizedJsonProvider` so you can connect your own licensed IPTV/HLS/API feed without rewriting the addon.

## Run locally

```bash
cp .env.example .env
npm start
```

Node 20+ is required. There are no runtime npm dependencies.

Open:

- `http://localhost:7000/manifest.json`
- `http://localhost:7000/configure`
- `http://localhost:7000/health`

## Install in Nuvio/Stremio

After deployment, install:

```text
https://YOUR-HOST/manifest.json
```

In Nuvio this goes under **Addons**, not Plugins.

## Render

Push the folder to GitHub and create a Render Web Service, or use the included `render.yaml`. The start command is:

```text
npm start
```

## Authorized feed schema

Set `AUTHORIZED_FEED_URL` to an HTTP endpoint returning either an array or `{ "items": [...] }`.

Example:

```json
{
  "items": [
    {
      "id": "channel-1",
      "title": "My Sports Channel",
      "category": "24/7",
      "is24_7": true,
      "poster": "https://example.com/poster.jpg",
      "streams": [
        {
          "name": "My Provider",
          "title": "1080p",
          "url": "https://cdn.example.com/live/channel-1/master.m3u8"
        }
      ]
    },
    {
      "id": "event-22",
      "title": "Team A vs Team B",
      "category": "football",
      "startTime": 1788134400000,
      "live": true,
      "streams": [
        { "url": "https://cdn.example.com/events/22/index.m3u8", "title": "Live" }
      ]
    }
  ]
}
```

For small self-hosted channel lists you can instead set `AUTHORIZED_CHANNELS_JSON` to the JSON array directly.

## Mirror behavior

### Streamed

By default:

```text
https://streamed.pk
https://streamed.st
```

The addon tries the most recently working host first and falls back to another base on request errors. When `STREAMED_DISCOVER_OFFICIAL_MIRRORS=true`, it may also read `STREAMED_MIRROR_INDEX` and accept only hostnames beginning with `streamed.`.

### PPV

Configure API bases explicitly:

```env
PPV_API_BASES=https://api.ppv.st
```

Additional bases can be comma-separated. The addon does not automatically rotate through third-party domains from general mirror indexes.

## Routes

```text
GET /manifest.json
GET /catalog/tv/:catalog.json
GET /catalog/tv/:catalog/search=query.json
GET /meta/tv/:id.json
GET /stream/tv/:id.json
GET /health
```

## Tests

```bash
npm test
npm run check
```

## Feed troubleshooting (v1.1)

This revision separates **feed discovery** from **playback**, like a normal Stremio live-event catalog. Streamed events can appear even if no playable source is configured.

Useful endpoints after deployment:

```text
GET /catalog/tv/nuvio_sports_today.json
GET /catalog/tv/nuvio_sports_live.json
GET /catalog/tv/nuvio_sports_networks.json
GET /debug/feed.json
GET /health
```

`/debug/feed.json` is the fastest way to verify whether upstream metadata is reaching the addon. If it contains `metas`, Nuvio should have catalog cards to display after refreshing/reinstalling the addon.

The Streamed adapter now tolerates partial failures: if `/api/matches/live` fails but `/api/matches/all-today` works (or vice versa), the working feed is still returned. If both fail, `/api/matches/all` is tried as a final metadata fallback.

## Playback test (v1.2)

This build includes a `🧪 Playback Test` catalog enabled by default. It returns Apple's public HLS example stream so you can verify that Nuvio/Stremio sees a provider and can start playback independently of the sports metadata providers. Apple publishes HLS example streams for developer testing.

After deployment, check:

- `/health` — should report version `1.2.0`
- `/catalog/tv/nuvio_sports_test.json` — should contain `Apple HLS Playback Test`
- `/stream/tv/ls:test:apple-bipbop.json` — should return one stream
- `/debug/playback-test.json` — convenience endpoint showing the same stream result

Set `TEST_PROVIDER_ENABLED=false` after testing if you want to hide the test catalog.
