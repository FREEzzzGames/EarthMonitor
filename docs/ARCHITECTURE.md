# EarthMonitor — Architecture Review

## 1. Overview

EarthMonitor is a static-first observation dashboard. The browser UI is served as static HTML/CSS/JavaScript; public data providers are queried directly where CORS and provider policy allow it. No provider secrets belong in client code.

## 2. Source layout

- `index.html` — application shell, panel markup, accessible controls, dialog containers, and script/style references.
- `styles.css` — monochrome responsive instrument-panel design, layout rules, panel states, modal and mobile styles.
- `app.js` — browser runtime: panel initialization, data requests, render/update routines, fallback states, localization and interactions.
- `scripts/earth-monitor-smoke.mjs` — Node smoke validation for markup, unique IDs, JavaScript syntax, DOM references and expected data-source integrations.
- `js/touch-tactical.js` — touch feedback, panel state, focus/scan transitions, telemetry toast and keyboard-triggered term help.
- `scripts/build-web.mjs` — stages the complete dashboard bundle, including the `js/` module directory, for Capacitor.
- `.github/workflows/pages.yml` — GitHub Pages validation and deployment workflow.
- `.github/workflows/android-apk.yml` — Android packaging workflow.

## 3. Data flow

```text
index.html
   ├── styles.css  → responsive panel layout
   └── app.js      → panel controllers
                    ├── public REST/JSON feeds
                    ├── normalization + threshold checks
                    ├── DOM rendering
                    └── status/fallback UI
scripts/earth-monitor-smoke.mjs → syntax + structural regression checks
GitHub Actions → validate → web deploy / Android build
```

## 4. Current monitoring domains

| Panel | Source / integration | Scope and caveat |
|---|---|---|
| Earthquakes | USGS GeoJSON | Public earthquake feed; provider timestamps and magnitudes |
| Weather / air quality | Open-Meteo | Local weather and AQI, subject to API availability |
| ISS | WhereTheISS.at | Current position sample, not a prediction |
| Earth observation events | NASA EONET | Open event catalogue; not a replacement for official emergency alerts |
| Space weather | NOAA SWPC JSON | Planetary Kp and related public space-weather products |
| Satellites | CelesTrak | Public orbital catalogue; elements are not precise live tracking |
| Airspace | OpenSky public state vectors | Availability/rate limits may apply; fallback must be labelled |
| Regional cameras | Public regional camera pages/feeds | Provider embedding and availability may vary |
| Lightning | LightningMaps external live map | External map only; no in-app strike count is fabricated without a stable supported feed |
| Volcanoes | NASA EONET open events | Event catalogue, not official volcano alert levels |
| Hydro | PEGELONLINE stations with current measurements + official LUBW Enz/Nagold gauge pages | Current values appear only where PEGELONLINE publishes them; local LUBW pages are linked separately because coverage is not interchangeable |
| Cyber / internet | Cloudflare Radar dashboard; Cloudflare DNS-over-HTTPS for DNS lookups | Radar remains external because some API routes require credentials; DoH timing is not root-server ICMP latency |

## 5. Reliability rules

1. A failed request must not be rendered as a real zero reading.
2. Fallback/simulated values must be explicitly labelled and never mixed with live observations.
3. All remote requests need bounded timeouts and visible failure states.
4. Public APIs may change, rate-limit, or block browser CORS; validate feeds independently.
5. Never commit API tokens to `app.js`, HTML, or the static bundle. Authenticated feeds require a server-side proxy and secret storage.
6. Threshold alerts are informational and do not replace official warnings from emergency-management authorities.

## 6. Local review

Requirements: Node.js 20+.

```bash
git clone https://github.com/FREEzzzGames/EarthMonitor.git
cd EarthMonitor
node scripts/earth-monitor-smoke.mjs
```

Serve the root directory with any static HTTP server, then open the local URL in a modern browser. Do not rely on `file://` for API testing: browser security/CORS behavior differs.

## 7. CI review

- Web workflow: https://github.com/FREEzzzGames/EarthMonitor/actions/workflows/pages.yml
- Android workflow: https://github.com/FREEzzzGames/EarthMonitor/actions/workflows/android-apk.yml

Inspect the latest run on the `main` branch before treating a deployment or APK as verified. A queued/in-progress build is not a successful build.


## 8. Global Streams selector

The global streams UI is implemented in `index.html`, `styles.css`, and `js/global-streams.js`. The selector exposes five distinct source classes without inventing measurements:

- **Lightning:** links to LightningMaps/Blitzortung as an external live map. The project does not assume a stable unauthenticated global strike API or display a fabricated strike count.
- **Cyber:** attempts to read URLhaus recent threat-intelligence records. These are submitted malicious URL records, not a DDoS rate or a global attack counter.
- **Aurora / space weather:** reads the NOAA SWPC OVATION aurora grid and solar-wind plasma feed. The grid is a probability forecast, not a visibility guarantee.
- **Maritime AIS:** requires a licensed AIS provider or authorized same-origin proxy. No vessel positions are synthesized.
- **EU energy:** requires an ENTSO-E token and server-side query proxy. Tokens must never be placed in static JavaScript or browser storage.

For AIS and energy, configure an authorized same-origin endpoint before the UI is expected to show telemetry:

```js
// Set in a deployment-owned bootstrap script served before js/global-streams.js.
// Both URLs must be same-origin endpoints. The backend stores provider credentials.
window.EARTHMONITOR_GLOBAL_STREAM_CONFIG = {
  marine: { url: "/api/global-streams/marine" },
  energy: { url: "/api/global-streams/energy" }
};
```

The expected proxy response is JSON. The browser stores only the last successfully fetched payload in localStorage and labels fallback data as cached/stale. A cache is not a substitute for an authenticated provider integration. External LightningMaps visualization remains an outbound link, not an in-app strike telemetry API.


## 9. Niche Telemetry & IoT Feeds

Implemented in `index.html`, `styles.css`, and `js/niche-telemetry.js`:

- **OGN / ADS-B Exchange:** links to OGN and documents provider restrictions. This client does not claim unrestricted ADS-B Exchange access or label aircraft as military without a supported data source.
- **Sensor.Community:** attempts a bounded nearby-area sensor query and renders returned PM measurements/record timestamps when the feed and browser CORS permit. Sensor availability is not uniform.
- **GBFS:** reads a provider GBFS discovery document (default demonstration endpoint: Citi Bike NYC) and lists discovered systems. GBFS is a standard, not a universal global mobility endpoint; provider-specific feeds are required for live station availability.
- **GitHub Events:** fetches public events from the official REST API. This is a sampled and rate-limited public event feed, not a complete commit counter.
- **Shodan:** requires a provider-specific authorized API or backend proxy for live scan/noise telemetry. InternetDB is not a global scanning stream, so the UI does not invent a scan rate.

All requests have a timeout, cancellation when the selected feed changes, last-successful-response cache, and an explicit unavailable/cache state. Cached observations retain their original timestamp. Provider credentials belong in server-side secrets, never in static JavaScript. Optional proxy endpoints can be supplied by a deployment-owned bootstrap script before `js/niche-telemetry.js`:

```js
window.EARTHMONITOR_NICHE_CONFIG = {
  aircraft: { url: "/api/niche/aircraft" },
  shodan: { url: "/api/niche/shodan" },
  gbfs: { url: "/api/niche/gbfs-discovery" }
};
```
