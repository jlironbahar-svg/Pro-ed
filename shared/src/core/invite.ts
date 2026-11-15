import type { AccessClaims, Channel, FlagMode, LatestApk, SystemState } from './types.js';
import { resolveFlags } from './flags.js';
import { DEFAULT_GRACE_HOURS } from './constants.js';

/*
  Serverless mode: the admin app publishes this file (proed-config.json) to the public
  GitHub repository and the student app reads it. It holds no names and no plain codes:
  invite codes are stored as slow PBKDF2 hashes.
*/

export const INVITE_HASH_ITERATIONS = 150_000;

export interface PublicUser {
  id: string;
  codeHash: string;
  channel: Channel;
  blocked: boolean;
  createdAt: number;
}

export interface PublicConfig {
  version: 1;
  rev: number;
  updatedAt: number;
  salt: string;
  iterations: number;
  graceHours: number;
  state: SystemState;
  message: string;
  minVersion: string;
  latestApk: LatestApk | null;
  flags: { key: string; mode: FlagMode; description: string }[];
  users: PublicUser[];
}

export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

/** PBKDF2-SHA256 of the normalized code, hex. Uses WebCrypto (browsers, Android WebView, Node 22). */
export async function hashInviteCode(code: string, salt: string, iterations = INVITE_HASH_ITERATIONS): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(normalizeInviteCode(code)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Same claims as the server's signed token, computed on the device from the public config. */
export function claimsFromConfig(config: PublicConfig, codeHash: string, now: number): AccessClaims {
  const user = config.users.find((u) => u.codeHash === codeHash);
  const allowed = !!user && !user.blocked;
  const channel: Channel = user?.channel ?? 'normal';
  const iat = Math.floor(now / 1000);
  return {
    allowed,
    ...(allowed ? {} : { reason: user ? ('blocked' as const) : ('unknown_code' as const) }),
    channel,
    state: config.state,
    message: config.message,
    flags: allowed ? resolveFlags(config.flags, channel) : {},
    minVersion: config.minVersion,
    latestApk: config.latestApk,
    rev: config.rev,
    ...(user && allowed ? { sub: user.id } : {}),
    iat,
    exp: iat + Math.round((config.graceHours || DEFAULT_GRACE_HOURS) * 3600),
  };
}
