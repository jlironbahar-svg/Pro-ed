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
    // The admin app uses the WebView's own fetch (needed for the APK upload); the server allows its origin (CORS).
    CapacitorHttp: { enabled: false },
    SystemBars: { insetsHandling: 'css' },
  },
};

export default config;
