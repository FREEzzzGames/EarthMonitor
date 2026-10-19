# EarthMonitor

**Planet Earth Control Deck** — a public-data dashboard for web and Android, built from one HTML/CSS/JavaScript source and packaged for Android with Capacitor.

## Web

- Source dashboard: `index.html`
- Public deployment: https://freezzzgames.github.io/EarthMonitor/
- Validation: `npm test` or `node scripts/earth-monitor-smoke.mjs`
- GitHub Pages workflow validates the standalone dashboard and publishes it.

## Capacitor Android

Android uses Capacitor and builds a local `www/` asset bundle, including the tactical module, into the APK. The current `capacitor.config.ts` sets `server.url` to the GitHub Pages deployment, so the installed app loads the hosted dashboard to receive web fixes without reinstalling. Internet is required for the dashboard shell in this configuration; offline startup is not guaranteed. Live feeds, remote imagery, video streams and camera sources also require internet.

Requirements: Node.js 22, JDK 17, Android SDK, Gradle 8.13.

```bash
npm install
npm test
npm run build
npx cap sync android
gradle -p android assembleDebug --no-daemon
```

Open Android Studio with `npx cap open android`. Capacitor config is in `capacitor.config.ts`; `scripts/build-web.mjs` stages `index.html`, `styles.css`, `app.js` and `js/touch-tactical.js` into `www/` before sync.

The native Android project retains the App Widgets API implementation:
- `android/app/src/main/java/com/freezzz/earthmonitor/EarthMonitorWidgetProvider.java`
- `android/app/src/main/res/layout/widget_earth_monitor.xml`
- `android/app/src/main/res/xml/earth_monitor_widget_info.xml`

The 4×2 home-screen widget refreshes public data independently of the WebView and opens the app from its launch action. It uses WhereTheISS.at, Open-Meteo, NOAA SWPC and USGS public endpoints; no API keys are embedded.

## Icon and logo

- SVG source: `assets/earth-monitor-logo.svg`
- Adaptive icon XML: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`

## Data and limitations

The dashboard consumes public endpoints from Open-Meteo, WhereTheISS.at, USGS, NASA EONET, NOAA SWPC, CelesTrak, NASA's media API, PEGELONLINE, NASA/JPL CNEOS, Launch Library 2, Safecast, Cloudflare DNS-over-HTTPS and the public Autobahn webcam API. Availability and browser CORS rules vary. LightningMaps and Cloudflare Radar are external dashboards rather than embedded global strike/network APIs. DNS timing measures client-to-Cloudflare DoH request latency, not ICMP ping to root servers. The regional water module shows PEGELONLINE current measurements where available and links to official LUBW Enz/Nagold gauge pages; these are distinct data systems. Camera tiles use live highway camera images when available; archive/animated fallback is not live CCTV. Public live data and video need an internet connection.

EarthMonitor is an independent project; it is not coupled to the FREEzzzGames/Base portal.
