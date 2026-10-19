# EarthMonitor Android

## App icon
- Source mission-patch SVG: `../assets/earth-monitor-logo.svg`
- Android adaptive icon: `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
- Foreground vector: `app/src/main/res/drawable/ic_launcher_foreground.xml`
- Background: pure black.

## Native 4×2 home-screen widget
The project uses the Android App Widgets API directly. Capacitor is not part of the current app shell (it is a native Android WebView host), and a Capacitor web plugin alone cannot install a launcher widget. A native provider is therefore the appropriate implementation.

Files:
- `app/src/main/res/layout/widget_earth_monitor.xml` — RemoteViews-compatible layout
- `app/src/main/res/xml/earth_monitor_widget_info.xml` — resizable 4×2 widget metadata
- `app/src/main/java/com/freezzz/earthmonitor/EarthMonitorWidgetProvider.java` — public-feed refresh and click actions
- `app/src/main/res/drawable/widget_card.xml` — translucent black card and neutral border

### Install / use
1. Build and install the Android app.
2. Long-press the Android launcher, choose **Widgets**, find **EarthMonitor Control Deck**, and place it on the home screen.
3. Resize it to approximately 4 columns × 2 rows. Launcher cell dimensions vary by device.
4. Tap ↻ to refresh or **OPEN DECK** to launch the dashboard.

### Data sources
- ISS position/altitude: WhereTheISS.at public API.
- Local weather/wind: Open-Meteo, fixed to Pforzheim (48.8922, 8.6946), wind in km/h.
- Planetary Kp index: NOAA SWPC public JSON.
- M2.5+ earthquakes in the last day: USGS GeoJSON feed.

The widget requests fresh data when it is added and when refresh is tapped. Android's periodic AppWidget update interval has a platform minimum of 30 minutes; background execution and network availability are controlled by Android. Each feed is independent, so a failed source leaves that field at its fallback value. No API keys are embedded.

### Capacitor note
Capacitor has no built-in API that creates launcher widgets. If the web application is later wrapped in Capacitor, keep this native AppWidgetProvider and expose app/widget interactions through a small native plugin only if the web UI needs to trigger them. Widget refresh should remain native and must not depend on the WebView being open.
