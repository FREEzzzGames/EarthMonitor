# EarthMonitor Android — Capacitor

The dashboard runs inside Capacitor's native Android bridge and is bundled locally into the APK. It does not depend on GitHub Pages to load the interface. External feeds, videos and live camera URLs still need connectivity.

## Build

```bash
npm install
npm test
npm run build
npx cap sync android
gradle -p android assembleDebug --no-daemon
```

Open the native project using `npx cap open android`.

## App icon

- SVG mission-patch source: `../assets/earth-monitor-logo.svg`
- Adaptive icon: `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
- Foreground vector: `app/src/main/res/drawable/ic_launcher_foreground.xml`
- Black background: `app/src/main/res/drawable/ic_launcher_background.xml`

## Native 4×2 home-screen widget

The home-screen widget uses Android App Widgets API. Capacitor itself does not provide launcher widgets, so the native `EarthMonitorWidgetProvider` is retained and works independently of the WebView.

- Layout: `app/src/main/res/layout/widget_earth_monitor.xml`
- Provider metadata: `app/src/main/res/xml/earth_monitor_widget_info.xml`
- Provider/data fetch: `app/src/main/java/com/freezzz/earthmonitor/EarthMonitorWidgetProvider.java`

Install the app, long-press the launcher, open **Widgets**, add **EarthMonitor Control Deck**, and resize it. Tap ↻ to refresh; tap **OPEN DECK** to open the dashboard.

## Data sources

- ISS: WhereTheISS.at
- Weather/wind for Pforzheim: Open-Meteo
- Kp index: NOAA SWPC
- M2.5+ earthquakes in the last day: USGS

The widget fetches data when added and on manual refresh. Android's periodic widget update interval has a minimum of 30 minutes; network availability and background execution are controlled by Android. No API keys are embedded.
