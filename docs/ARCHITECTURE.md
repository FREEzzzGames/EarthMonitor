# EarthMonitor — Architecture Review

## 1. Overview

EarthMonitor is a static-first observation dashboard. The browser UI is served as static HTML/CSS/JavaScript; public data providers are queried directly where CORS and provider policy allow it. No provider secrets belong in client code.

## 2. Source layout

- `index.html` — application shell, panel markup, accessible controls, dialog containers, and script/style references.
- `styles.css` — monochrome responsive instrument-panel design, layout rules, panel states, modal and mobile styles.
- `app.js` — browser runtime: panel initialization, data requests, render/update routines, fallback states, localization and interactions.
- `scripts/earth-monitor-smoke.mjs` — Node smoke validation for markup, unique IDs, JavaScript syntax, DOM references and expected data-source integrations.
- `scripts/build-web.mjs` — web packaging/copy step.
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
