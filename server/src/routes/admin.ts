import type { FastifyInstance, FastifyRequest } from 'fastify';
import multipart from '@fastify/multipart';
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';
import { verify as verifyTotp } from 'otplib';
import {
  ONLINE_WINDOW_MS,
  isValidVersion,
  lastDays,
  dayKey,
  type AccessEvent,
  type AdminLoginRequest,
  type AdminLoginResponse,
  type AdminUser,
  type AdminUserDetails,
  type AuditEntry,
  type Channel,
  type DashboardData,
  type DeviceInfo,
  type FlagMode,
  type OnlineDevice,
  type SystemState,
} from '@proed/shared/core';
import type { DB } from '../db.js';
import type { Config } from '../config.js';
import { formatCode } from '../lib/codes.js';
import { verifyPassword } from '../lib/password.js';
import { audit, bumpRevision, createUser, deleteFlag, findUser, getSetting, getSystem, listFlags, setSetting, upsertFlag, type UserRow } from '../repo.js';

interface AdminRow {
  password_hash: string;
  totp_secret: string;
  token_version: number;
}

interface AdminClaims {
  typ: 'admin';
  v: number;
}

const MAX_APK_BYTES = 200 * 1024 * 1024;

const USER_SELECT = `
  SELECT u.*, d.device_type, d.app_version
  FROM users u
  LEFT JOIN devices d ON d.id = (SELECT id FROM devices WHERE user_id = u.id ORDER BY last_seen DESC LIMIT 1)`;

type UserJoinRow = UserRow & { device_type: string | null; app_version: string | null };

function toAdminUser(r: UserJoinRow): AdminUser {
  return {
    id: r.id,
    code: formatCode(r.code),
    label: r.label,
    channel: r.channel,
    blocked: !!r.blocked,
    createdAt: r.created_at,
    lastSeen: r.last_seen,
    deviceType: (r.device_type as AdminUser['deviceType']) ?? null,
    appVersion: r.app_version,
    bound: !!r.username_hash,
  };
}

function userName(r: { label: string; code: string }): string {
  return r.label ? `${r.label} (${formatCode(r.code)})` : formatCode(r.code);
}

/*
  Admin API for ProEd Admin. Every route except /admin/login needs an admin JWT
  (HS256, ADMIN_JWT_SECRET). Every change is written to the audit log.
*/
export async function adminRoutes(app: FastifyInstance, opts: { db: DB; config: Config }): Promise<void> {
  const { db, config } = opts;
  const getAdmin = () => db.prepare('SELECT password_hash, totp_secret, token_version FROM admin WHERE id = 1').get() as AdminRow | undefined;

  await app.register(multipart, { limits: { fileSize: MAX_APK_BYTES, files: 1, fields: 5, parts: 6 } });

  app.post<{ Body: AdminLoginRequest }>(
    '/admin/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
      schema: {
        body: {
          type: 'object',
          required: ['password', 'totp'],
          additionalProperties: false,
          properties: { password: { type: 'string', maxLength: 200 }, totp: { type: 'string', pattern: '^[0-9]{6}$' } },
        },
      },
    },
    async (req, reply): Promise<AdminLoginResponse | { error: string }> => {
      const admin = getAdmin();
      const passwordOk = admin ? await verifyPassword(req.body.password, admin.password_hash) : false;
      let totpOk = false;
      if (admin && passwordOk) {
        const lastStep = Number(getSetting(db, 'admin_totp_step') ?? 0);
        const result = await verifyTotp({ secret: admin.totp_secret, token: req.body.totp, epochTolerance: 30, afterTimeStep: lastStep });
        if (result.valid && 'timeStep' in result) {
          totpOk = true;
          setSetting(db, 'admin_totp_step', String(result.timeStep));
        }
      }
      if (!admin || !passwordOk || !totpOk) {
        audit(db, 'admin.login_failed', passwordOk ? 'wrong 2FA code' : 'wrong password');
        return reply.code(401).send({ error: 'invalid_credentials' });
      }
      db.prepare('UPDATE admin SET last_login = ? WHERE id = 1').run(Date.now());
      audit(db, 'admin.login');
      const expiresIn = Math.round(config.adminSessionHours * 3600);
      const token = app.jwt.sign({ typ: 'admin', v: admin.token_version } satisfies AdminClaims, { expiresIn });
      return { token, expiresAt: Date.now() + expiresIn * 1000 };
    },
  );

  // Everything below requires a valid admin session.
  await app.register(async (secured) => {
    secured.addHook('onRequest', async (req: FastifyRequest, reply) => {
      try {
        const claims = await req.jwtVerify<AdminClaims>();
        const admin = getAdmin();
        if (claims.typ !== 'admin' || !admin || claims.v !== admin.token_version) throw new Error('revoked');
      } catch {
        return reply.code(401).send({ error: 'unauthorized' });
      }
    });

    secured.post('/admin/logout', async () => {
      db.prepare('UPDATE admin SET token_version = token_version + 1 WHERE id = 1').run();
      audit(db, 'admin.logout', 'all admin sessions closed');
      return { ok: true };
    });

    /* ---------- dashboard ---------- */

    secured.get('/admin/dashboard', async (): Promise<DashboardData> => {
      const now = Date.now();
      const tz = config.timeZone;
      const online = (
        db
          .prepare(
            `SELECT d.user_id, d.device_type, d.app_version, d.last_seen, u.label, u.code
             FROM devices d JOIN users u ON u.id = d.user_id WHERE d.last_seen >= ? ORDER BY d.last_seen DESC LIMIT 200`,
          )
          .all(now - ONLINE_WINDOW_MS) as { user_id: string; device_type: string; app_version: string; last_seen: number; label: string; code: string }[]
      ).map(
        (r): OnlineDevice => ({
          userId: r.user_id,
          label: r.label,
          code: formatCode(r.code),
          deviceType: r.device_type as OnlineDevice['deviceType'],
          appVersion: r.app_version,
          lastSeen: r.last_seen,
        }),
      );
      const days = lastDays(now, 30, tz);
      const counts = new Map(
        (db.prepare('SELECT day, COUNT(*) AS n FROM activity WHERE day >= ? GROUP BY day').all(days[0]) as { day: string; n: number }[]).map((r) => [r.day, r.n]),
      );
      const today = dayKey(now, tz);
      const weekStart = lastDays(now, 7, tz)[0];
      const count = (sql: string, ...p: unknown[]) => (db.prepare(sql).get(...p) as { n: number }).n;
      const events = (kind: 'check' | 'denied'): AccessEvent[] =>
        (
          db
            .prepare(
              `SELECT e.*, u.label, u.code AS user_code FROM events e LEFT JOIN users u ON u.id = e.user_id
               WHERE e.kind = ? ORDER BY e.at DESC LIMIT 25`,
            )
            .all(kind) as {
            id: number;
            at: number;
            kind: 'check' | 'denied';
            code: string | null;
            reason: string | null;
            device_type: string | null;
            app_version: string | null;
            label: string | null;
            user_code: string | null;
          }[]
        ).map((r) => ({
          id: r.id,
          at: r.at,
          kind: r.kind,
          userLabel: r.user_code ? userName({ label: r.label ?? '', code: r.user_code }) : null,
          code: r.code ? formatCode(r.code) : null,
          reason: r.reason,
          deviceType: r.device_type as AccessEvent['deviceType'],
          appVersion: r.app_version,
        }));
      return {
        now,
        online,
        totals: {
          users: count('SELECT COUNT(*) AS n FROM users'),
          activeToday: count('SELECT COUNT(DISTINCT user_id) AS n FROM activity WHERE day = ?', today),
          activeWeek: count('SELECT COUNT(DISTINCT user_id) AS n FROM activity WHERE day >= ?', weekStart),
        },
        daily: days.map((day) => ({ day, users: counts.get(day) ?? 0 })),
        recentChecks: events('check'),
        recentDenied: events('denied'),
      };
    });

    /* ---------- users and invite codes ---------- */

    secured.get<{ Querystring: { q?: string } }>('/admin/users', async (req): Promise<AdminUser[]> => {
      const q = (req.query.q ?? '').trim();
      const rows = q
        ? (db
            .prepare(`${USER_SELECT} WHERE u.label LIKE ? OR u.code LIKE ? ORDER BY u.created_at DESC`)
            .all(`%${q}%`, `%${q.toUpperCase().replace(/[^A-Z0-9]/g, '')}%`) as UserJoinRow[])
        : (db.prepare(`${USER_SELECT} ORDER BY u.created_at DESC`).all() as UserJoinRow[]);
      return rows.map(toAdminUser);
    });

    secured.post<{ Body: { label?: string } }>(
      '/admin/users',
      { schema: { body: { type: 'object', additionalProperties: false, properties: { label: { type: 'string', maxLength: 60 } } } } },
      async (req): Promise<AdminUser> => {
        const user = createUser(db, req.body?.label ?? '');
        audit(db, 'invite.create', userName(user));
        return toAdminUser({ ...user, device_type: null, app_version: null });
      },
    );

    secured.get<{ Params: { id: string } }>('/admin/users/:id', async (req, reply): Promise<AdminUserDetails | void> => {
      const row = db.prepare(`${USER_SELECT} WHERE u.id = ?`).get(req.params.id) as UserJoinRow | undefined;
      if (!row) return reply.code(404).send({ error: 'not_found' });
      const devices = (
        db.prepare('SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen DESC').all(row.id) as {
          id: string;
          device_type: string;
          app_version: string;
          first_seen: number;
          last_seen: number;
        }[]
      ).map(
        (d): DeviceInfo => ({
          id: d.id.slice(0, 8),
          deviceType: d.device_type as DeviceInfo['deviceType'],
          appVersion: d.app_version,
          firstSeen: d.first_seen,
          lastSeen: d.last_seen,
        }),
      );
      return { ...toAdminUser(row), devices };
    });

    secured.patch<{ Params: { id: string }; Body: { label?: string; channel?: Channel; blocked?: boolean } }>(
      '/admin/users/:id',
      {
        schema: {
          body: {
            type: 'object',
            additionalProperties: false,
            properties: {
              label: { type: 'string', maxLength: 60 },
              channel: { type: 'string', enum: ['normal', 'beta'] },
              blocked: { type: 'boolean' },
            },
          },
        },
      },
      async (req, reply): Promise<AdminUser | void> => {
        const user = findUser(db, req.params.id);
        if (!user) return reply.code(404).send({ error: 'not_found' });
        const { label, channel, blocked } = req.body;
        if (label !== undefined) {
          db.prepare('UPDATE users SET label = ? WHERE id = ?').run(label.trim(), user.id);
          audit(db, 'user.rename', `${userName(user)} -> ${label.trim()}`);
        }
        if (channel !== undefined && channel !== user.channel) {
          db.prepare('UPDATE users SET channel = ? WHERE id = ?').run(channel, user.id);
          audit(db, 'user.channel', `${userName(user)}: ${channel}`);
        }
        if (blocked !== undefined && blocked !== !!user.blocked) {
          db.prepare('UPDATE users SET blocked = ? WHERE id = ?').run(blocked ? 1 : 0, user.id);
          audit(db, blocked ? 'user.block' : 'user.unblock', userName(user));
        }
        bumpRevision(db);
        return toAdminUser(db.prepare(`${USER_SELECT} WHERE u.id = ?`).get(user.id) as UserJoinRow);
      },
    );

    secured.delete<{ Params: { id: string } }>('/admin/users/:id', async (req, reply) => {
      const user = findUser(db, req.params.id);
      if (!user) return reply.code(404).send({ error: 'not_found' });
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
      audit(db, 'user.delete', userName(user));
      bumpRevision(db);
      return { ok: true };
    });

    /* ---------- feature flags ---------- */

    secured.get('/admin/flags', async () => listFlags(db));

    secured.put<{ Params: { key: string }; Body: { mode: FlagMode; description?: string } }>(
      '/admin/flags/:key',
      {
        schema: {
          params: { type: 'object', properties: { key: { type: 'string', pattern: '^[a-z0-9_]{2,40}$' } } },
          body: {
            type: 'object',
            required: ['mode'],
            additionalProperties: false,
            properties: { mode: { type: 'string', enum: ['on', 'beta', 'off'] }, description: { type: 'string', maxLength: 120 } },
          },
        },
      },
      async (req) => {
        const existing = listFlags(db).find((f) => f.key === req.params.key);
        upsertFlag(db, req.params.key, req.body.mode, req.body.description ?? existing?.description ?? '');
        audit(db, existing ? 'flag.update' : 'flag.create', `${req.params.key}: ${req.body.mode}`);
        bumpRevision(db);
        return listFlags(db);
      },
    );

    secured.delete<{ Params: { key: string } }>('/admin/flags/:key', async (req, reply) => {
      if (!deleteFlag(db, req.params.key)) return reply.code(404).send({ error: 'not_found' });
      audit(db, 'flag.delete', req.params.key);
      bumpRevision(db);
      return listFlags(db);
    });

    /* ---------- system controls ---------- */

    secured.get('/admin/system', async () => getSystem(db, config.publicUrl));

    secured.put<{ Body: { state?: SystemState; message?: string; minVersion?: string } }>(
      '/admin/system',
      {
        schema: {
          body: {
            type: 'object',
            additionalProperties: false,
            properties: {
              state: { type: 'string', enum: ['ACTIVE', 'RECOVERY', 'SHUTDOWN'] },
              message: { type: 'string', maxLength: 500 },
              minVersion: { type: 'string', maxLength: 20 },
            },
          },
        },
      },
      async (req, reply) => {
        const { state, message, minVersion } = req.body;
        if (minVersion !== undefined && !isValidVersion(minVersion)) return reply.code(400).send({ error: 'invalid_version' });
        const before = getSystem(db, config.publicUrl);
        if (state !== undefined && state !== before.state) {
          setSetting(db, 'state', state);
          audit(db, 'system.state', `${before.state} -> ${state}`);
        }
        if (message !== undefined && message !== before.message) {
          setSetting(db, 'message', message.trim());
          audit(db, 'system.message', message.trim() || '(empty)');
        }
        if (minVersion !== undefined && minVersion !== before.minVersion) {
          setSetting(db, 'min_version', minVersion.trim());
          audit(db, 'system.min_version', `${before.minVersion} -> ${minVersion.trim()}`);
        }
        bumpRevision(db);
        return getSystem(db, config.publicUrl);
      },
    );

    secured.post<{ Querystring: { version?: string } }>('/admin/apk', async (req, reply) => {
      const version = (req.query.version ?? '').trim();
      if (!isValidVersion(version)) return reply.code(400).send({ error: 'invalid_version' });
      const file = await req.file();
      if (!file) return reply.code(400).send({ error: 'no_file' });
      if (!file.filename.toLowerCase().endsWith('.apk')) {
        file.file.resume();
        return reply.code(400).send({ error: 'not_an_apk' });
      }
      const dir = join(config.dataDir, 'apk');
      mkdirSync(dir, { recursive: true });
      const name = `proed-${version}.apk`;
      const tmp = join(dir, `${name}.upload`);
      await pipeline(file.file, createWriteStream(tmp));
      if (file.file.truncated) {
        rmSync(tmp, { force: true });
        return reply.code(413).send({ error: 'too_large' });
      }
      const previous = getSetting(db, 'apk_file');
      renameSync(tmp, join(dir, name));
      if (previous && previous !== name && existsSync(join(dir, previous))) rmSync(join(dir, previous), { force: true });
      const size = statSync(join(dir, name)).size;
      setSetting(db, 'apk_file', name);
      setSetting(db, 'apk_version', version);
      setSetting(db, 'apk_size', String(size));
      setSetting(db, 'apk_uploaded_at', String(Date.now()));
      audit(db, 'apk.upload', `${version} (${Math.round(size / 1024)} KB)`);
      bumpRevision(db);
      return getSystem(db, config.publicUrl);
    });

    /* ---------- audit log ---------- */

    secured.get<{ Querystring: { limit?: string } }>('/admin/audit', async (req): Promise<AuditEntry[]> => {
      const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 200) || 200));
      return db.prepare('SELECT id, at, action, detail FROM audit ORDER BY id DESC LIMIT ?').all(limit) as AuditEntry[];
    });
  });
}
