import { resolve } from 'node:path';
import { DEFAULT_GRACE_HOURS } from '@proed/shared/core';

/** All settings come from environment variables (see .env.example). */
export interface Config {
  port: number;
  host: string;
  publicUrl: string;
  trustProxy: boolean;
  forceHttps: boolean;
  dataDir: string;
  pwaDir: string;
  corsOrigins: string[];
  adminJwtSecret: string;
  adminSessionHours: number;
  accessPrivateKey: string;
  accessPublicKey: string;
  graceHours: number;
  relayExtraHosts: string[];
  logLevel: string;
}

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** PEM keys are stored base64-encoded in .env so they fit on one line. */
function pem(value: string | undefined): string {
  if (!value) return '';
  return value.includes('BEGIN') ? value.replace(/\\n/g, '\n') : Buffer.from(value, 'base64').toString('utf8');
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const root = resolve(import.meta.dirname, '..');
  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? '0.0.0.0',
    publicUrl: (env.PUBLIC_URL ?? 'http://localhost:8787').replace(/\/$/, ''),
    trustProxy: env.TRUST_PROXY !== 'false',
    forceHttps: env.FORCE_HTTPS === 'true',
    dataDir: resolve(env.DATA_DIR ?? resolve(root, 'data')),
    pwaDir: resolve(env.PWA_DIR ?? resolve(root, '../proed-app/dist')),
    corsOrigins: list(env.CORS_ORIGINS ?? 'https://localhost,http://localhost,capacitor://localhost,http://localhost:5173,http://localhost:5174'),
    adminJwtSecret: env.ADMIN_JWT_SECRET ?? '',
    adminSessionHours: Number(env.ADMIN_SESSION_HOURS ?? 12),
    accessPrivateKey: pem(env.ACCESS_PRIVATE_KEY),
    accessPublicKey: pem(env.ACCESS_PUBLIC_KEY),
    graceHours: Number(env.ACCESS_GRACE_HOURS ?? DEFAULT_GRACE_HOURS),
    relayExtraHosts: list(env.RELAY_EXTRA_HOSTS).map((h) => h.toLowerCase()),
    logLevel: env.LOG_LEVEL ?? 'info',
  };
}

export function assertSecrets(config: Config): void {
  const missing: string[] = [];
  if (config.adminJwtSecret.length < 32) missing.push('ADMIN_JWT_SECRET (32+ chars)');
  if (!config.accessPrivateKey) missing.push('ACCESS_PRIVATE_KEY');
  if (!config.accessPublicKey) missing.push('ACCESS_PUBLIC_KEY');
  if (missing.length) {
    throw new Error(`Missing secrets: ${missing.join(', ')}. Run "npm run setup -w proed-server" first.`);
  }
}
