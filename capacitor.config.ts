import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.monetiq.app',
  appName: 'Monetiq',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
