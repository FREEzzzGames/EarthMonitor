import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.freezzz.earthmonitor',
  appName: 'EarthMonitor',
  webDir: 'www',
  server: {
    // Load the deployed dashboard so web UI fixes publish to installed APKs
    // without reinstalling the native application. Requires network access.
    url: 'https://freezzzgames.github.io/EarthMonitor/',
    cleartext: false
  },
  android: {
    backgroundColor: '#050505',
    allowMixedContent: false
  }
};

export default config;
