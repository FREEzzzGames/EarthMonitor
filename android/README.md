# EarthMonitor Android

Native fullscreen landscape WebView host for the EarthMonitor dashboard.

The Android app loads the shared web implementation at https://freezzzgames.github.io/EarthMonitor/. JavaScript, DOM storage and muted media autoplay are enabled. A network connection is required on first launch.

Build with Android SDK and Gradle 8.9+: `gradle -p android assembleDebug`.
The GitHub Actions workflow uploads `EarthMonitor-android-debug-apk` as a downloadable artifact.
