/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Absolute server URL, used by the Android build. Empty for the PWA (same origin). */
  readonly VITE_SERVER_URL?: string;
  /** Optional SPKI public key (base64) to verify access tokens. */
  readonly VITE_ACCESS_PUBLIC_KEY?: string;
}

interface Navigator {
  /** iOS Safari: true when launched from the home screen. */
  standalone?: boolean;
}
