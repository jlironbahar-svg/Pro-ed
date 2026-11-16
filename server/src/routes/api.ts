import type { FastifyInstance } from 'fastify';
import type { CheckRequest, CheckResponse, HeartbeatRequest, HeartbeatResponse } from '@proed/shared/core';
import { isValidVersion } from '@proed/shared/core';
import type { DB } from '../db.js';
import type { Config } from '../config.js';
import { normalizeCode } from '../lib/codes.js';
import { buildClaims, decideCheck, type CheckUser } from '../lib/access.js';
import type { AccessTokens } from '../lib/tokens.js';
import {
  bindUsername,
  createUser,
  findUser,
  findUserByCode,
  findUserByDevice,
  findUserByUsernameHash,
  getRevision,
  getSystem,
  listFlags,
  logEvent,
  touchDevice,
  type UserRow,
} from '../repo.js';

const DEVICE_TYPES = ['iphone-pwa', 'android-apk', 'web'];

const device = {
  deviceId: { type: 'string', pattern: '^[A-Za-z0-9-]{8,64}$' },
  deviceType: { type: 'string', enum: DEVICE_TYPES },
  appVersion: { type: 'string', maxLength: 20 },
} as const;

function toCheckUser(row: UserRow | undefined): CheckUser | undefined {
  return row ? { id: row.id, channel: row.channel, blocked: !!row.blocked, usernameHash: row.username_hash } : undefined;
}

/**
 * Open access (no invite codes): one user per Pronote account (username hash), else per device.
 * A device that signs in to another Pronote account moves to that account's user.
 */
function openAccessUser(db: DB, deviceId: string, usernameHash: string | undefined): UserRow {
  const deviceUser = findUserByDevice(db, deviceId);
  if (usernameHash) {
    const owner = findUserByUsernameHash(db, usernameHash);
    if (owner) return owner;
    if (deviceUser && !deviceUser.username_hash) return deviceUser;
    return createUser(db, '');
  }
  return deviceUser ?? createUser(db, '');
}

/*
  Public access API used by the ProEd app.
  /api/check receives only: invite code, random device id, SHA-256 of the Pronote username,
  device type and app version. Never a password, never homework.
*/
export async function apiRoutes(app: FastifyInstance, opts: { db: DB; config: Config; tokens: AccessTokens }): Promise<void> {
  const { db, config, tokens } = opts;

  app.post<{ Body: CheckRequest }>(
    '/api/check',
    {
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['deviceId', 'deviceType', 'appVersion'],
          additionalProperties: false,
          properties: {
            inviteCode: { type: 'string', maxLength: 32 },
            usernameHash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
            ...device,
          },
        },
      },
    },
    async (req): Promise<CheckResponse> => {
      const body = req.body;
      const code = normalizeCode(body.inviteCode ?? '');
      const appVersion = isValidVersion(body.appVersion) ? body.appVersion : '0.0.0';
      let row = code ? findUserByCode(db, code) : undefined;
      if (!row && config.openAccess) row = openAccessUser(db, body.deviceId, body.usernameHash);
      const user = toCheckUser(row);
      const decision = decideCheck(user, body.usernameHash);
      const now = Date.now();

      db.transaction(() => {
        if (decision.allowed && user) {
          if (decision.bind && body.usernameHash) bindUsername(db, user.id, body.usernameHash);
          touchDevice(db, user.id, { id: body.deviceId, deviceType: body.deviceType, appVersion }, now, config.timeZone);
          logEvent(db, { kind: 'check', userId: user.id, deviceType: body.deviceType, appVersion }, now);
        } else {
          logEvent(db, { kind: 'denied', userId: user?.id ?? null, code: code || null, reason: decision.reason, deviceType: body.deviceType, appVersion }, now);
        }
      })();

      const claims = buildClaims(decision, user, getSystem(db, config.publicUrl), listFlags(db), getRevision(db));
      return { token: tokens.sign(claims), publicKey: tokens.publicKey };
    },
  );

  app.post<{ Body: HeartbeatRequest }>(
    '/api/heartbeat',
    {
      config: { rateLimit: { max: 600, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['deviceId', 'deviceType', 'appVersion'],
          additionalProperties: false,
          properties: device,
        },
      },
    },
    async (req, reply): Promise<HeartbeatResponse> => {
      const auth = req.headers.authorization ?? '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      let claims;
      try {
        claims = tokens.verify(token);
      } catch {
        reply.code(401);
        return { ok: false, recheck: true };
      }
      const user = claims.sub ? findUser(db, claims.sub) : undefined;
      if (!user || user.blocked || !claims.allowed) return { ok: false, recheck: true };

      const appVersion = isValidVersion(req.body.appVersion) ? req.body.appVersion : '0.0.0';
      touchDevice(db, user.id, { id: req.body.deviceId, deviceType: req.body.deviceType, appVersion }, Date.now(), config.timeZone);
      return { ok: true, recheck: claims.rev !== getRevision(db) || claims.channel !== user.channel };
    },
  );
}
