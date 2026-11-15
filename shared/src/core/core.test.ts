import { describe, expect, it } from 'vitest';
import { compareVersions, isValidVersion, isVersionBelow } from './version';
import { dayKey, isOnline, lastDays } from './presence';
import { resolveFlags } from './flags';
import { ONLINE_WINDOW_MS } from './constants';

describe('presence', () => {
  const now = 1_800_000_000_000;
  it('counts a device as online if seen in the last 2 minutes', () => {
    expect(ONLINE_WINDOW_MS).toBe(120_000);
    expect(isOnline(now, now)).toBe(true);
    expect(isOnline(now - 119_000, now)).toBe(true);
    expect(isOnline(now - 120_000, now)).toBe(true);
    expect(isOnline(now - 121_000, now)).toBe(false);
  });
  it('treats never seen as offline and tolerates small clock skew', () => {
    expect(isOnline(null, now)).toBe(false);
    expect(isOnline(undefined, now)).toBe(false);
    expect(isOnline(now + 3_000, now)).toBe(true);
    expect(isOnline(now + 60_000, now)).toBe(false);
  });
  it('builds day keys in a time zone', () => {
    const lateEvening = Date.UTC(2026, 10, 15, 23, 30); // 00:30 the next day in Paris
    expect(dayKey(lateEvening)).toBe('2026-11-15');
    expect(dayKey(lateEvening, 'Europe/Paris')).toBe('2026-11-16');
  });
  it('lists the last 30 days, oldest first', () => {
    const days = lastDays(Date.UTC(2026, 10, 15, 12), 30);
    expect(days).toHaveLength(30);
    expect(days[29]).toBe('2026-11-15');
    expect(days[0]).toBe('2026-10-17');
  });
});

describe('versions', () => {
  it('compares numerically', () => {
    expect(compareVersions('1.2.10', '1.2.9')).toBe(1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
    expect(isVersionBelow('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionBelow('1.0.0', null)).toBe(false);
  });
  it('validates version strings', () => {
    expect(isValidVersion('1.2.3')).toBe(true);
    expect(isValidVersion('1.2.3-beta')).toBe(false);
    expect(isValidVersion('abc')).toBe(false);
  });
});

describe('feature flags', () => {
  const flags = [
    { key: 'a', mode: 'on' as const },
    { key: 'b', mode: 'beta' as const },
    { key: 'c', mode: 'off' as const },
  ];
  it('resolves per channel', () => {
    expect(resolveFlags(flags, 'normal')).toEqual({ a: true, b: false, c: false });
    expect(resolveFlags(flags, 'beta')).toEqual({ a: true, b: true, c: false });
  });
});

import { claimsFromConfig, hashInviteCode, normalizeInviteCode, type PublicConfig } from './invite';

describe('serverless invite codes', () => {
  const config = (users: PublicConfig['users']): PublicConfig => ({
    version: 1,
    rev: 4,
    updatedAt: 0,
    salt: 'salt-1',
    iterations: 1000,
    graceHours: 72,
    state: 'RECOVERY',
    message: 'Maintenance',
    minVersion: '1.0.0',
    latestApk: null,
    flags: [{ key: 'timer', mode: 'beta', description: '' }],
    users,
  });

  it('normalizes and hashes codes the same way everywhere', async () => {
    expect(normalizeInviteCode('ab cd-23 45')).toBe('ABCD2345');
    const a = await hashInviteCode('abcd-2345', 'salt-1', 1000);
    expect(a).toBe(await hashInviteCode('ABCD2345', 'salt-1', 1000));
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(await hashInviteCode('ABCD2345', 'salt-2', 1000));
  });

  it('builds claims from the public config', async () => {
    const hash = await hashInviteCode('ABCD2345', 'salt-1', 1000);
    const now = 1_800_000_000_000;
    const ok = claimsFromConfig(config([{ id: 'u1', codeHash: hash, channel: 'beta', blocked: false, createdAt: 0 }]), hash, now);
    expect(ok).toMatchObject({ allowed: true, channel: 'beta', state: 'RECOVERY', message: 'Maintenance', flags: { timer: true }, rev: 4, sub: 'u1' });
    expect(ok.exp! - ok.iat!).toBe(72 * 3600);
    expect(claimsFromConfig(config([{ id: 'u1', codeHash: hash, channel: 'normal', blocked: true, createdAt: 0 }]), hash, now)).toMatchObject({
      allowed: false,
      reason: 'blocked',
      flags: {},
    });
    expect(claimsFromConfig(config([]), hash, now)).toMatchObject({ allowed: false, reason: 'unknown_code' });
  });
});
