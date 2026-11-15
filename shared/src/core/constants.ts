/** Timings shared by the app, the admin app and the server. */
export const HEARTBEAT_INTERVAL_MS = 60_000;
export const ONLINE_WINDOW_MS = 2 * 60_000;
export const ACCESS_CHECK_INTERVAL_MS = 15 * 60_000;
export const DEFAULT_GRACE_HOURS = 72;
export const ADMIN_REFRESH_MS = 10_000;

/** Feature flags the ProEd app understands. Unknown keys are ignored by the app. */
export const KNOWN_FLAGS = {
  qr_login: 'Login with a Pronote QR code',
  timer: 'Start/stop timer on homework',
  today_view: 'Today view with suggested order',
} as const;

export type KnownFlag = keyof typeof KNOWN_FLAGS;
