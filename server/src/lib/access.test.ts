import { describe, expect, it } from 'vitest';
import type { SystemSettings } from '@proed/shared/core';
import { buildClaims, decideCheck, type CheckUser } from './access.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const user = (over: Partial<CheckUser> = {}): CheckUser => ({ id: 'u1', channel: 'normal', blocked: false, usernameHash: null, ...over });
const system: SystemSettings = { state: 'ACTIVE', message: '', minVersion: '1.0.0', latestApk: null };

describe('decideCheck', () => {
  it('denies unknown codes', () => {
    expect(decideCheck(undefined, HASH_A)).toEqual({ allowed: false, reason: 'unknown_code', bind: false });
  });
  it('denies blocked users', () => {
    expect(decideCheck(user({ blocked: true }), HASH_A)).toMatchObject({ allowed: false, reason: 'blocked' });
  });
  it('allows a fresh code and binds it to the first username', () => {
    expect(decideCheck(user(), HASH_A)).toEqual({ allowed: true, bind: true });
  });
  it('allows before the first Pronote login without binding', () => {
    expect(decideCheck(user(), undefined)).toEqual({ allowed: true, bind: false });
  });
  it('allows the bound username and refuses another one', () => {
    expect(decideCheck(user({ usernameHash: HASH_A }), HASH_A)).toEqual({ allowed: true, bind: false });
    expect(decideCheck(user({ usernameHash: HASH_A }), HASH_B)).toMatchObject({ allowed: false, reason: 'code_in_use' });
  });
});

describe('buildClaims', () => {
  const flags = [
    { key: 'timer', mode: 'beta' as const, description: '' },
    { key: 'qr_login', mode: 'on' as const, description: '' },
  ];
  it('carries state, message, flags, versions and the user id', () => {
    const claims = buildClaims({ allowed: true, bind: false }, user({ channel: 'beta' }), { ...system, state: 'RECOVERY', message: 'Hi' }, flags, 3);
    expect(claims).toEqual({
      allowed: true,
      channel: 'beta',
      state: 'RECOVERY',
      message: 'Hi',
      flags: { timer: true, qr_login: true },
      minVersion: '1.0.0',
      latestApk: null,
      rev: 3,
      sub: 'u1',
    });
  });
  it('gives no flags and no user id when denied', () => {
    const claims = buildClaims({ allowed: false, reason: 'blocked', bind: false }, user({ blocked: true }), system, flags, 0);
    expect(claims.flags).toEqual({});
    expect(claims.sub).toBeUndefined();
    expect(claims.reason).toBe('blocked');
  });
});
