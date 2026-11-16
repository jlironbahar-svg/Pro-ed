import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.proed.admin',
  appName: 'ProEd Admin',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Native HTTP: no CORS, and no ngrok warning page (it only targets browsers). FormData uploads work too.
    CapacitorHttp: { enabled: true },
    SystemBars: { insetsHandling: 'css' },
  },
};

export default config;
