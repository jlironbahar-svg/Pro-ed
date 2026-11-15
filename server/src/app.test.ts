import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { generate } from 'otplib';
import { generateSecret as totpSecret } from 'otplib';
import type { AccessClaims, CheckResponse, DashboardData } from '@proed/shared/core';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { openDb, type DB } from './db.js';
import { generateAccessKeys, generateSecret } from './lib/keys.js';
import { hashPassword } from './lib/password.js';
import { createUser } from './repo.js';
import { isAllowedTarget } from './routes/relay.js';

const keys = generateAccessKeys();
const config = {
  ...loadConfig({}),
  dataDir: ':memory:',
  pwaDir: '/nonexistent',
  logLevel: 'silent',
  adminJwtSecret: generateSecret(),
  accessPrivateKey: keys.privatePem,
  accessPublicKey: keys.publicPem,
  graceHours: 72,
};
const HASH = 'c'.repeat(64);
const decode = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as AccessClaims;

let app: FastifyInstance;
let db: DB;
let code: string;
const secret = totpSecret();

beforeAll(async () => {
  db = openDb(':memory:');
  db.prepare('INSERT INTO admin (id, password_hash, totp_secret, created_at) VALUES (1, ?, ?, ?)').run(await hashPassword('correct-horse-battery'), secret, Date.now());
  code = createUser(db, 'Lina').code;
  app = await buildApp({ config, db });
});
afterAll(() => app.close());

const check = (body: object) => app.inject({ method: 'POST', url: '/api/check', payload: { deviceType: 'android-apk', appVersion: '1.0.0', deviceId: 'device-0001', ...body } });

describe('/api/check', () => {
  it('signs an ES256 token valid for the grace period', async () => {
    const res = await check({ inviteCode: code.toLowerCase().replace(/(.{4})/, '$1-'), usernameHash: HASH });
    expect(res.statusCode).toBe(200);
    const body = res.json<CheckResponse>();
    const header = JSON.parse(Buffer.from(body.token.split('.')[0], 'base64url').toString());
    expect(header.alg).toBe('ES256');
    const claims = decode(body.token);
    expect(claims).toMatchObject({ allowed: true, state: 'ACTIVE', channel: 'normal' });
    expect(claims.exp! - claims.iat!).toBe(72 * 3600);
    expect(body.publicKey.length).toBeGreaterThan(50);
  });
  it('refuses unknown codes and another Pronote account, and logs the attempts', async () => {
    expect(decode((await check({ inviteCode: 'ZZZZ-ZZZZ' })).json<CheckResponse>().token)).toMatchObject({ allowed: false, reason: 'unknown_code' });
    const other = await check({ inviteCode: code, usernameHash: 'd'.repeat(64), deviceId: 'device-0002' });
    expect(decode(other.json<CheckResponse>().token)).toMatchObject({ allowed: false, reason: 'code_in_use' });
    const denied = db.prepare("SELECT COUNT(*) AS n FROM events WHERE kind = 'denied'").get() as { n: number };
    expect(denied.n).toBe(2);
  });
  it('rejects requests with a password or homework field', async () => {
    const res = await check({ inviteCode: code, password: 'secret' });
    expect(res.statusCode).toBe(400);
  });
  it('reports blocked users and the system state', async () => {
    db.prepare('UPDATE users SET blocked = 1').run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('state', 'SHUTDOWN'), ('message', 'Fermé')").run();
    const claims = decode((await check({ inviteCode: code, usernameHash: HASH })).json<CheckResponse>().token);
    expect(claims).toMatchObject({ allowed: false, reason: 'blocked', state: 'SHUTDOWN', message: 'Fermé' });
    db.prepare('UPDATE users SET blocked = 0').run();
    db.prepare("DELETE FROM settings WHERE key IN ('state', 'message')").run();
  });
});

describe('presence', () => {
  let adminToken = '';

  it('needs a valid access token for the heartbeat', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/heartbeat', payload: { deviceId: 'device-0001', deviceType: 'android-apk', appVersion: '1.0.0' } });
    expect(res.statusCode).toBe(401);
  });

  it('marks the device online after a heartbeat and shows it on the dashboard', async () => {
    const token = (await check({ inviteCode: code, usernameHash: HASH })).json<CheckResponse>().token;
    db.prepare('UPDATE devices SET last_seen = ?').run(Date.now() - 10 * 60_000);
    const hb = await app.inject({
      method: 'POST',
      url: '/api/heartbeat',
      headers: { authorization: `Bearer ${token}` },
      payload: { deviceId: 'device-0001', deviceType: 'android-apk', appVersion: '1.0.0' },
    });
    expect(hb.json()).toEqual({ ok: true, recheck: false });

    const login = await app.inject({ method: 'POST', url: '/admin/login', payload: { password: 'correct-horse-battery', totp: await generate({ secret }) } });
    expect(login.statusCode).toBe(200);
    adminToken = login.json<{ token: string }>().token;
    const dash = (await app.inject({ method: 'GET', url: '/admin/dashboard', headers: { authorization: `Bearer ${adminToken}` } })).json<DashboardData>();
    expect(dash.online).toHaveLength(1);
    expect(dash.online[0]).toMatchObject({ label: 'Lina', deviceType: 'android-apk', appVersion: '1.0.0' });
    expect(dash.totals).toMatchObject({ users: 1, activeToday: 1, activeWeek: 1 });
    expect(dash.daily).toHaveLength(30);
  });

  it('drops a device from the online list after 2 minutes', async () => {
    db.prepare('UPDATE devices SET last_seen = ?').run(Date.now() - 121_000);
    const dash = (await app.inject({ method: 'GET', url: '/admin/dashboard', headers: { authorization: `Bearer ${adminToken}` } })).json<DashboardData>();
    expect(dash.online).toHaveLength(0);
  });

  it('asks the app to re-check after an admin change', async () => {
    const token = (await check({ inviteCode: code, usernameHash: HASH })).json<CheckResponse>().token;
    await app.inject({ method: 'PUT', url: '/admin/system', headers: { authorization: `Bearer ${adminToken}` }, payload: { state: 'RECOVERY' } });
    const hb = await app.inject({
      method: 'POST',
      url: '/api/heartbeat',
      headers: { authorization: `Bearer ${token}` },
      payload: { deviceId: 'device-0001', deviceType: 'android-apk', appVersion: '1.0.0' },
    });
    expect(hb.json()).toEqual({ ok: true, recheck: true });
  });
});

describe('admin security', () => {
  it('protects admin routes', async () => {
    expect((await app.inject({ method: 'GET', url: '/admin/users' })).statusCode).toBe(401);
    const accessToken = (await check({ inviteCode: code, usernameHash: HASH })).json<CheckResponse>().token;
    expect((await app.inject({ method: 'GET', url: '/admin/users', headers: { authorization: `Bearer ${accessToken}` } })).statusCode).toBe(401);
  });
  it('refuses a wrong 2FA code', async () => {
    const res = await app.inject({ method: 'POST', url: '/admin/login', payload: { password: 'correct-horse-battery', totp: '000000' } });
    expect(res.statusCode).toBe(401);
  });
  it('writes admin actions to the audit log', () => {
    const actions = (db.prepare('SELECT action FROM audit').all() as { action: string }[]).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['admin.login', 'system.state', 'admin.login_failed']));
  });
});

describe('relay target rules', () => {
  it('only allows HTTPS Pronote hosts', () => {
    expect(isAllowedTarget('https://0692579D.index-education.net/pronote/eleve.html', [])).not.toBeNull();
    expect(isAllowedTarget('https://www.index-education.com/swie/geoloc.php', [])).not.toBeNull();
    expect(isAllowedTarget('http://0692579D.index-education.net/pronote/', [])).toBeNull();
    expect(isAllowedTarget('https://evil.example.com/', [])).toBeNull();
    expect(isAllowedTarget('https://127.0.0.1/', [])).toBeNull();
    expect(isAllowedTarget('https://index-education.net.evil.com/', [])).toBeNull();
    expect(isAllowedTarget('https://pronote.lycee.fr/pronote/', ['pronote.lycee.fr'])).not.toBeNull();
  });
});
