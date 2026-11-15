import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.proed.student',
  appName: 'ProEd',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Native HTTP: Pronote is called directly from the APK (no CORS, no relay).
    CapacitorHttp: { enabled: true },
    SystemBars: { insetsHandling: 'css' },
  },
};

export default config;
