export type SystemState = 'ACTIVE' | 'RECOVERY' | 'SHUTDOWN';
export type Channel = 'normal' | 'beta';
export type FlagMode = 'on' | 'beta' | 'off';
export type DeviceType = 'iphone-pwa' | 'android-apk' | 'web';

export type DenyReason = 'unknown_code' | 'blocked' | 'code_in_use' | 'invalid_request';

/* ---------- Public access API ---------- */

export interface CheckRequest {
  inviteCode: string;
  deviceId: string;
  /** SHA-256 hex of the lowercased Pronote username. Optional before the first Pronote login. */
  usernameHash?: string;
  deviceType: DeviceType;
  appVersion: string;
}

export interface LatestApk {
  version: string;
  url: string;
}

/** Claims carried inside the access JWT (ES256, signed by the server). */
export interface AccessClaims {
  allowed: boolean;
  reason?: DenyReason;
  channel: Channel;
  state: SystemState;
  message: string;
  flags: Record<string, boolean>;
  minVersion: string;
  latestApk: LatestApk | null;
  /** Settings revision: the heartbeat asks for a new check when it changes. */
  rev: number;
  /** user id */
  sub?: string;
  iat?: number;
  exp?: number;
}

export interface CheckResponse {
  token: string;
  /** SPKI public key (base64, DER) used to verify the token offline. */
  publicKey: string;
}

export interface HeartbeatRequest {
  deviceId: string;
  deviceType: DeviceType;
  appVersion: string;
}

export interface HeartbeatResponse {
  ok: boolean;
  /** Tells the app to run a fresh access check (state or user changed). */
  recheck: boolean;
}

/* ---------- Admin API ---------- */

export interface AdminLoginRequest {
  password: string;
  totp: string;
}

export interface AdminLoginResponse {
  token: string;
  expiresAt: number;
}

export interface OnlineDevice {
  userId: string;
  label: string;
  code: string;
  deviceType: DeviceType;
  appVersion: string;
  lastSeen: number;
}

export interface AccessEvent {
  id: number;
  at: number;
  kind: 'check' | 'denied';
  userLabel: string | null;
  code: string | null;
  reason: string | null;
  deviceType: DeviceType | null;
  appVersion: string | null;
}

export interface DashboardData {
  now: number;
  /** false in serverless mode: there is no live data without the server. */
  live?: boolean;
  online: OnlineDevice[];
  totals: { users: number; activeToday: number; activeWeek: number };
  daily: { day: string; users: number }[];
  recentChecks: AccessEvent[];
  recentDenied: AccessEvent[];
}

export interface DeviceInfo {
  id: string;
  deviceType: DeviceType;
  appVersion: string;
  firstSeen: number;
  lastSeen: number;
}

export interface AdminUser {
  id: string;
  code: string;
  label: string;
  channel: Channel;
  blocked: boolean;
  createdAt: number;
  lastSeen: number | null;
  deviceType: DeviceType | null;
  appVersion: string | null;
  bound: boolean;
}

export interface AdminUserDetails extends AdminUser {
  devices: DeviceInfo[];
}

export interface FeatureFlag {
  key: string;
  mode: FlagMode;
  description: string;
}

export interface SystemSettings {
  state: SystemState;
  message: string;
  minVersion: string;
  latestApk: (LatestApk & { size: number; uploadedAt: number }) | null;
}

export interface AuditEntry {
  id: number;
  at: number;
  action: string;
  detail: string;
}
