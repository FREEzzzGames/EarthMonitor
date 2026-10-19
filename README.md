# EarthMonitor

**Planet Earth Control Deck** — a standalone public-data dashboard for web and Android.

## Web

The complete dashboard is self-contained in `index.html` (HTML, CSS, JavaScript, localization, public-data adapters, video fallbacks, regional camera grid and interactions). No frontend framework or build step is required.

- Local preview: `python -m http.server 8080`, then open `http://localhost:8080`.
- Public URL after GitHub Pages deployment: https://freezzzgames.github.io/EarthMonitor/
- Smoke test: `node scripts/earth-monitor-smoke.mjs`.

## Android

The `android/` folder contains a native Android WebView shell that opens the same hosted dashboard. The WebView enables JavaScript, DOM storage and muted media autoplay; it uses hardware acceleration and landscape orientation for the instrument-panel layout.

- Build locally: `gradle -p android assembleDebug`.
- The Android workflow builds a debug APK and publishes it as an Actions artifact.

The app currently loads the hosted web application; first launch requires an internet connection. This keeps web and Android on the same source of truth rather than maintaining separate UI implementations.

## Data sources and limitations

The dashboard consumes public endpoints from Open-Meteo, WhereTheISS.at, USGS, NASA EONET, NOAA SWPC, CelesTrak, NASA's media API and the public Autobahn webcam API. Availability and browser embedding rules vary. No API keys are embedded in client code. Calculated visualizations are not presented as direct sensor measurements; regional camera frames appear only when the public API returns usable image URLs.

## Project structure

- `index.html` — complete standalone dashboard.
- `scripts/earth-monitor-smoke.mjs` — structural and JavaScript syntax checks.
- `android/` — Android WebView app.
- `.github/workflows/pages.yml` — validation and GitHub Pages deployment.
- `.github/workflows/android-apk.yml` — APK build workflow.

EarthMonitor is independent of the FREEzzzGames/Base portal repository.
