/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Default server URL (the admin can change it on the login screen). */
  readonly VITE_SERVER_URL?: string;
  /** owner/name of the GitHub repository used as the store in serverless mode. */
  readonly VITE_GITHUB_REPO?: string;
}
