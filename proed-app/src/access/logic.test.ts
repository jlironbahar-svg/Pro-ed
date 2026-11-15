import { describe, expect, it } from 'vitest';
import type { AccessClaims } from '@proed/shared/core';
import { canCallPronote, evaluateAccess } from './logic';

const NOW = 1_800_000_000_000;
const claims = (over: Partial<AccessClaims> = {}): AccessClaims => ({
  allowed: true,
  channel: 'normal',
  state: 'ACTIVE',
  message: '',
  flags: {},
  minVersion: '1.0.0',
  latestApk: null,
  rev: 0,
  iat: NOW / 1000 - 3600,
  exp: NOW / 1000 + 71 * 3600,
  ...over,
});

describe('evaluateAccess', () => {
  it('allows a valid token', () => {
    expect(evaluateAccess(claims(), NOW, '1.0.0', false)).toEqual({ kind: 'ok', recovery: false, message: '', update: null });
  });
  it('keeps working offline during the grace period, then locks', () => {
    const issued = claims({ iat: NOW / 1000, exp: NOW / 1000 + 72 * 3600 });
    expect(evaluateAccess(issued, NOW + 71 * 3600_000, '1.0.0', false).kind).toBe('ok');
    expect(evaluateAccess(issued, NOW + 72 * 3600_000, '1.0.0', false)).toEqual({ kind: 'locked', reason: 'expired' });
  });
  it('locks when not allowed or blocked', () => {
    expect(evaluateAccess(claims({ allowed: false, reason: 'blocked' }), NOW, '1.0.0', false)).toEqual({ kind: 'locked', reason: 'denied' });
  });
  it('shows the shutdown message', () => {
    expect(evaluateAccess(claims({ state: 'SHUTDOWN', message: 'Fermé ce week-end.' }), NOW, '1.0.0', false)).toEqual({
      kind: 'shutdown',
      message: 'Fermé ce week-end.',
    });
  });
  it('switches to recovery without Pronote calls', () => {
    const view = evaluateAccess(claims({ state: 'RECOVERY', message: 'Maintenance' }), NOW, '1.0.0', false);
    expect(view).toMatchObject({ kind: 'ok', recovery: true, message: 'Maintenance' });
    expect(canCallPronote(view)).toBe(false);
    expect(canCallPronote(evaluateAccess(claims(), NOW, '1.0.0', false))).toBe(true);
  });
  it('blocks versions below the minimum', () => {
    const apk = { version: '1.3.0', url: 'https://x/download/proed.apk' };
    expect(evaluateAccess(claims({ minVersion: '1.2.0', latestApk: apk }), NOW, '1.1.9', true)).toEqual({ kind: 'update-required', apk });
    expect(evaluateAccess(claims({ minVersion: '1.2.0', latestApk: apk }), NOW, '1.1.9', false)).toEqual({ kind: 'update-required', apk: null });
  });
  it('offers an optional update on Android only', () => {
    const apk = { version: '1.1.0', url: 'https://x/download/proed.apk' };
    expect(evaluateAccess(claims({ latestApk: apk }), NOW, '1.0.0', true)).toMatchObject({ kind: 'ok', update: apk });
    expect(evaluateAccess(claims({ latestApk: apk }), NOW, '1.0.0', false)).toMatchObject({ kind: 'ok', update: null });
    expect(evaluateAccess(claims({ latestApk: apk }), NOW, '1.1.0', true)).toMatchObject({ kind: 'ok', update: null });
  });
  it('locks a token without expiry', () => {
    expect(evaluateAccess(claims({ exp: undefined }), NOW, '1.0.0', false).kind).toBe('locked');
  });
});
