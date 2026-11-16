import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { KNOWN_FLAGS } from '@proed/shared/core';

/** The small part of SQLite the server uses. Works with better-sqlite3 or Node's built-in node:sqlite. */
export interface Statement {
  run(...params: unknown[]): { changes: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface DB {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  /** Wraps fn in BEGIN/COMMIT (ROLLBACK on error), like better-sqlite3's transaction(). */
  transaction<T>(fn: () => T): () => T;
  close(): void;
  /** Which driver is in use: "better-sqlite3" or "node:sqlite". */
  driver: string;
}

const require = createRequire(import.meta.url);

/*
  better-sqlite3 is a native module: it is fast but needs a prebuilt binary for the platform.
  On an Android phone (Termux) there is none, so the server falls back to node:sqlite, built into
  Node.js 22.13+. Both give the same synchronous API below.
*/
function openDriver(path: string): DB {
  if (process.env.PROED_SQLITE !== 'node') {
    try {
      const Better = require('better-sqlite3') as new (p: string) => {
        prepare(sql: string): Statement;
        exec(sql: string): void;
        transaction<T>(fn: () => T): () => T;
        close(): void;
      };
      const db = new Better(path);
      return {
        prepare: (sql) => db.prepare(sql),
        exec: (sql) => void db.exec(sql),
        transaction: (fn) => db.transaction(fn),
        close: () => db.close(),
        driver: 'better-sqlite3',
      };
    } catch {
      /* not installed or no binary for this platform: use node:sqlite */
    }
  }
  const { DatabaseSync } = require('node:sqlite') as {
    DatabaseSync: new (p: string) => { prepare(sql: string): Statement; exec(sql: string): void; close(): void };
  };
  const db = new DatabaseSync(path);
  return {
    prepare: (sql) => db.prepare(sql),
    exec: (sql) => db.exec(sql),
    transaction:
      <T>(fn: () => T) =>
      () => {
        db.exec('BEGIN');
        try {
          const result = fn();
          db.exec('COMMIT');
          return result;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      },
    close: () => db.close(),
    driver: 'node:sqlite',
  };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'normal' CHECK (channel IN ('normal', 'beta')),
  blocked INTEGER NOT NULL DEFAULT 0,
  username_hash TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER
);
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  app_version TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS devices_last_seen ON devices(last_seen);
CREATE TABLE IF NOT EXISTS activity (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS activity_day ON activity(day);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('check', 'denied')),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  code TEXT,
  reason TEXT,
  device_type TEXT,
  app_version TEXT
);
CREATE INDEX IF NOT EXISTS events_at ON events(at);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS flags (
  key TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('on', 'beta', 'off')),
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  totp_secret TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login INTEGER
);
`;

/** Opens (and creates) the SQLite database. Only access data is stored: no homework, grades or passwords. */
export function openDb(dataDir: string, file = 'proed.sqlite'): DB {
  let path = ':memory:';
  if (dataDir !== ':memory:') {
    mkdirSync(dataDir, { recursive: true });
    path = join(dataDir, file);
  }
  const db = openDriver(path);
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec(SCHEMA);
  const seed = db.prepare('INSERT OR IGNORE INTO flags (key, mode, description) VALUES (?, ?, ?)');
  for (const [key, description] of Object.entries(KNOWN_FLAGS)) seed.run(key, 'on', description);
  return db;
}

const EVENT_RETENTION_MS = 90 * 86_400_000;
const ACTIVITY_RETENTION_DAYS = 400;

export function pruneOldData(db: DB, now = Date.now()): void {
  db.prepare('DELETE FROM events WHERE at < ?').run(now - EVENT_RETENTION_MS);
  const cutoff = new Date(now - ACTIVITY_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  db.prepare('DELETE FROM activity WHERE day < ?').run(cutoff);
}
