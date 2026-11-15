import type { AccessClaims } from '@proed/shared/core';

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function decodeClaims(token: string): AccessClaims | null {
  try {
    const part = token.split('.')[1];
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(part))) as AccessClaims;
  } catch {
    return null;
  }
}

/** Verifies an ES256 JWT with WebCrypto (the JWS signature is raw r||s, which is what WebCrypto expects). */
export async function verifyToken(token: string, spkiBase64: string): Promise<AccessClaims | null> {
  try {
    const [h, p, sig] = token.split('.');
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h))) as { alg?: string };
    if (header.alg !== 'ES256' || !sig) return null;
    const key = await crypto.subtle.importKey('spki', b64urlToBytes(spkiBase64.replace(/=+$/, '')), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      b64urlToBytes(sig),
      new TextEncoder().encode(`${h}.${p}`),
    );
    return ok ? decodeClaims(token) : null;
  } catch {
    return null;
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
