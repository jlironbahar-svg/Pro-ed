import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { sha256Hex, verifyToken } from './jwt';

// Signs like the server does (ES256, JWS raw r||s signature) and checks the app accepts only valid tokens.
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const spki = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');

function makeToken(payload: object, key = privateKey): string {
  const input = `${b64({ alg: 'ES256', typ: 'JWT' })}.${b64(payload)}`;
  const sig = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${input}.${sig}`;
}

describe('verifyToken', () => {
  it('accepts a token signed by the server key', async () => {
    const claims = await verifyToken(makeToken({ allowed: true, state: 'ACTIVE' }), spki);
    expect(claims).toMatchObject({ allowed: true, state: 'ACTIVE' });
  });
  it('rejects a token edited on the device', async () => {
    const [h, , s] = makeToken({ allowed: false }).split('.');
    const forged = `${h}.${b64({ allowed: true })}.${s}`;
    expect(await verifyToken(forged, spki)).toBeNull();
  });
  it('rejects a token signed with another key', async () => {
    const other = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
    expect(await verifyToken(makeToken({ allowed: true }, other), spki)).toBeNull();
  });
  it('rejects other algorithms and garbage', async () => {
    const none = `${b64({ alg: 'none' })}.${b64({ allowed: true })}.`;
    expect(await verifyToken(none, spki)).toBeNull();
    expect(await verifyToken('not-a-token', spki)).toBeNull();
  });
});

describe('sha256Hex', () => {
  it('hashes the username like the server expects', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
