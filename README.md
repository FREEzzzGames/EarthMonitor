# EarthMonitor

**Planet Earth Control Deck** — a public-data dashboard for web and Android, built from one HTML/CSS/JavaScript source and packaged for Android with Capacitor.

## Web

- Source dashboard: `index.html`
- Public deployment: https://freezzzgames.github.io/EarthMonitor/
- Validation: `npm test` or `node scripts/earth-monitor-smoke.mjs`
- GitHub Pages workflow validates the standalone dashboard and publishes it.

## Capacitor Android

Android uses Capacitor's native bridge and packages a local copy of the dashboard in the APK. It no longer navigates to the hosted GitHub Pages URL at launch. The dashboard shell is therefore available offline; live feeds, remote imagery, video streams and camera sources still require internet.

Requirements: Node.js 22, JDK 17, Android SDK, Gradle 8.13.

```bash
npm install
npm test
npm run build
npx cap sync android
gradle -p android assembleDebug --no-daemon
```

Open Android Studio with `npx cap open android`. Capacitor config is in `capacitor.config.ts`; `scripts/build-web.mjs` stages `index.html` into `www/` before sync.

The native Android project retains the App Widgets API implementation:
- `android/app/src/main/java/com/freezzz/earthmonitor/EarthMonitorWidgetProvider.java`
- `android/app/src/main/res/layout/widget_earth_monitor.xml`
- `android/app/src/main/res/xml/earth_monitor_widget_info.xml`

The 4×2 home-screen widget refreshes public data independently of the WebView and opens the app from its launch action. It uses WhereTheISS.at, Open-Meteo, NOAA SWPC and USGS public endpoints; no API keys are embedded.

## Icon and logo

- SVG source: `assets/earth-monitor-logo.svg`
- Adaptive icon XML: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`

## Data and limitations

The dashboard consumes public endpoints from Open-Meteo, WhereTheISS.at, USGS, NASA EONET, NOAA SWPC, CelesTrak, NASA's media API and the public Autobahn webcam API. Availability and embedding rules vary by source. Regional camera tiles show standby when no usable feed is available. Public live data and video need an internet connection.

EarthMonitor is an independent project; it is not coupled to the FREEzzzGames/Base portal.
