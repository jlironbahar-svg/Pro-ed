/*
  ProEd server setup.
    npm run setup -w proed-server                  secrets (if missing) + admin account + first invite code
    npm run setup -w proed-server -- --secrets-only   only generate the secrets into server/.env
    npm run setup -w proed-server -- --reset-admin    recreate the admin account (new password and 2FA)
  Options: --password <pw>  choose the admin password (default: a random one is generated)
           --label <name>   label for the first invite code (default: "Admin")
*/
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { generateSecret as totpSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { formatCode } from './lib/codes.js';
import { hashPassword } from './lib/password.js';
import { generateAccessKeys, generateSecret, publicKeySpkiBase64 } from './lib/keys.js';
import { audit, createUser } from './repo.js';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const root = resolve(import.meta.dirname, '..');
const envPath = resolve(root, '.env');

function setEnvValue(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  return re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
}

/** Generates missing secrets and writes them to server/.env (created from .env.example). */
function ensureSecrets(): void {
  const env = process.env;
  if (env.ADMIN_JWT_SECRET && env.ACCESS_PRIVATE_KEY && env.ACCESS_PUBLIC_KEY) {
    console.log('Secrets: already set in the environment.');
    return;
  }
  let content = existsSync(envPath)
    ? readFileSync(envPath, 'utf8')
    : existsSync(resolve(root, '.env.example'))
      ? readFileSync(resolve(root, '.env.example'), 'utf8')
      : '';
  if (!env.ADMIN_JWT_SECRET) {
    env.ADMIN_JWT_SECRET = generateSecret();
    content = setEnvValue(content, 'ADMIN_JWT_SECRET', env.ADMIN_JWT_SECRET);
  }
  if (!env.ACCESS_PRIVATE_KEY || !env.ACCESS_PUBLIC_KEY) {
    const keys = generateAccessKeys();
    env.ACCESS_PRIVATE_KEY = Buffer.from(keys.privatePem).toString('base64');
    env.ACCESS_PUBLIC_KEY = Buffer.from(keys.publicPem).toString('base64');
    content = setEnvValue(content, 'ACCESS_PRIVATE_KEY', env.ACCESS_PRIVATE_KEY);
    content = setEnvValue(content, 'ACCESS_PUBLIC_KEY', env.ACCESS_PUBLIC_KEY);
  }
  writeFileSync(envPath, content, { mode: 0o600 });
  console.log(`Secrets: generated and saved to ${envPath} (keep this file private, never commit it).`);
}

function randomPassword(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(20);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out.replace(/(.{5})(?=.)/g, '$1-');
}

async function main(): Promise<void> {
  ensureSecrets();
  const config = loadConfig();
  console.log(`\nAccess public key (optional VITE_ACCESS_PUBLIC_KEY for the app builds):\n${publicKeySpkiBase64(config.accessPublicKey)}\n`);
  if (flag('--secrets-only')) return;

  const db = openDb(config.dataDir);
  const existing = db.prepare('SELECT id FROM admin WHERE id = 1').get();
  if (existing && !flag('--reset-admin')) {
    console.log('Admin account: already exists. Use --reset-admin to recreate it.');
  } else {
    const password = option('--password') ?? randomPassword();
    if (password.length < 12) throw new Error('The admin password must be at least 12 characters.');
    const secret = totpSecret();
    const uri = generateURI({ issuer: 'ProEd', label: 'admin', secret });
    db.prepare(
      `INSERT INTO admin (id, password_hash, totp_secret, token_version, created_at) VALUES (1, ?, ?, 0, ?)
       ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, totp_secret = excluded.totp_secret,
         token_version = admin.token_version + 1`,
    ).run(await hashPassword(password), secret, Date.now());
    audit(db, existing ? 'admin.reset' : 'admin.create', 'from setup script');

    console.log('Admin account created.');
    console.log(`  Password: ${password}`);
    console.log('  Write it down now: it is not stored anywhere in clear text.\n');
    console.log('Scan this QR code with an authenticator app (Google Authenticator, Aegis, 2FAS...):\n');
    console.log(await QRCode.toString(uri, { type: 'terminal', small: true }));
    console.log(`  Or enter this key by hand: ${secret}\n`);
  }

  const hasUsers = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (hasUsers.n === 0) {
    const user = createUser(db, option('--label') ?? 'Admin');
    audit(db, 'invite.create', `${formatCode(user.code)} (${user.label}) from setup script`);
    console.log(`First invite code: ${formatCode(user.code)}  (label: ${user.label})`);
  } else {
    console.log(`Invite codes: ${hasUsers.n} already exist. Create more from ProEd Admin.`);
  }
  db.close();
}

main().catch((err: Error) => {
  console.error(`Setup failed: ${err.message}`);
  process.exit(1);
});
