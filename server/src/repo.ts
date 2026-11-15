import { randomUUID } from 'node:crypto';
import type { Channel, FeatureFlag, FlagMode, SystemSettings, SystemState } from '@proed/shared/core';
import { dayKey } from '@proed/shared/core';
import type { DB } from './db.js';
import { generateCode } from './lib/codes.js';

/* ---------- settings ---------- */

export function getSetting(db: DB, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(db: DB, key: string, value: string): void {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

/** Bumped on every admin change, so apps re-check quickly (through the heartbeat). */
export function bumpRevision(db: DB): number {
  const next = getRevision(db) + 1;
  setSetting(db, 'rev', String(next));
  return next;
}

export function getRevision(db: DB): number {
  return Number(getSetting(db, 'rev') ?? 0);
}

export function getSystem(db: DB, publicUrl: string): SystemSettings {
  const apkVersion = getSetting(db, 'apk_version');
  return {
    state: (getSetting(db, 'state') as SystemState | undefined) ?? 'ACTIVE',
    message: getSetting(db, 'message') ?? '',
    minVersion: getSetting(db, 'min_version') ?? '0.0.0',
    latestApk: apkVersion
      ? {
          version: apkVersion,
          url: `${publicUrl}/download/proed.apk`,
          size: Number(getSetting(db, 'apk_size') ?? 0),
          uploadedAt: Number(getSetting(db, 'apk_uploaded_at') ?? 0),
        }
      : null,
  };
}

/* ---------- flags ---------- */

export function listFlags(db: DB): FeatureFlag[] {
  return db.prepare('SELECT key, mode, description FROM flags ORDER BY key').all() as FeatureFlag[];
}

export function upsertFlag(db: DB, key: string, mode: FlagMode, description: string): void {
  db.prepare(
    'INSERT INTO flags (key, mode, description) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET mode = excluded.mode, description = excluded.description',
  ).run(key, mode, description);
}

export function deleteFlag(db: DB, key: string): boolean {
  return db.prepare('DELETE FROM flags WHERE key = ?').run(key).changes > 0;
}

/* ---------- users ---------- */

export interface UserRow {
  id: string;
  code: string;
  label: string;
  channel: Channel;
  blocked: number;
  username_hash: string | null;
  created_at: number;
  last_seen: number | null;
}

export function findUserByCode(db: DB, code: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE code = ?').get(code) as UserRow | undefined;
}

export function findUser(db: DB, id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function createUser(db: DB, label: string, now = Date.now()): UserRow {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    if (findUserByCode(db, code)) continue;
    const id = randomUUID();
    db.prepare('INSERT INTO users (id, code, label, created_at) VALUES (?, ?, ?, ?)').run(id, code, label.trim().slice(0, 60), now);
    return findUser(db, id)!;
  }
  throw new Error('could not generate a unique code');
}

export function bindUsername(db: DB, userId: string, hash: string): void {
  db.prepare('UPDATE users SET username_hash = ? WHERE id = ? AND username_hash IS NULL').run(hash, userId);
}

/* ---------- presence and activity ---------- */

export function touchDevice(
  db: DB,
  userId: string,
  device: { id: string; deviceType: string; appVersion: string },
  now = Date.now(),
  timeZone = 'UTC',
): void {
  db.prepare(
    `INSERT INTO devices (id, user_id, device_type, app_version, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, device_type = excluded.device_type,
       app_version = excluded.app_version, last_seen = excluded.last_seen`,
  ).run(device.id, userId, device.deviceType, device.appVersion, now, now);
  db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(now, userId);
  db.prepare('INSERT OR IGNORE INTO activity (user_id, day) VALUES (?, ?)').run(userId, dayKey(now, timeZone));
}

export function logEvent(
  db: DB,
  e: { kind: 'check' | 'denied'; userId?: string | null; code?: string | null; reason?: string | null; deviceType?: string | null; appVersion?: string | null },
  now = Date.now(),
): void {
  db.prepare('INSERT INTO events (at, kind, user_id, code, reason, device_type, app_version) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    now,
    e.kind,
    e.userId ?? null,
    e.code ?? null,
    e.reason ?? null,
    e.deviceType ?? null,
    e.appVersion ?? null,
  );
}

/* ---------- audit ---------- */

export function audit(db: DB, action: string, detail = '', now = Date.now()): void {
  db.prepare('INSERT INTO audit (at, action, detail) VALUES (?, ?, ?)').run(now, action, detail.slice(0, 500));
}
