import { createPublicKey, generateKeyPairSync, randomBytes } from 'node:crypto';

/** ES256 (P-256) key pair for access tokens, PEM encoded. */
export function generateAccessKeys(): { privatePem: string; publicPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

/** SPKI DER, base64: the format the app imports with WebCrypto. */
export function publicKeySpkiBase64(publicPem: string): string {
  return createPublicKey(publicPem).export({ type: 'spki', format: 'der' }).toString('base64');
}

export function generateSecret(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}
