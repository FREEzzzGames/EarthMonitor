import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.freezzz.earthmonitor',
  appName: 'EarthMonitor',
  webDir: 'www',
  android: {
    backgroundColor: '#050505',
    allowMixedContent: false
  }
};

export default config;
