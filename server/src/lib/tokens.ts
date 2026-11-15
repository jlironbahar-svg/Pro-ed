import type { FastifyInstance } from 'fastify';
import type { AccessClaims } from '@proed/shared/core';
import type { Config } from '../config.js';
import { publicKeySpkiBase64 } from './keys.js';

export interface AccessTokens {
  sign(claims: AccessClaims): string;
  verify(token: string): AccessClaims;
  publicKey: string;
}

/** Access tokens are ES256: the app can check them offline with the public key. */
export function accessTokens(app: FastifyInstance, config: Config): AccessTokens {
  return {
    sign: (claims) =>
      app.jwt.sign({ ...claims }, { key: config.accessPrivateKey, algorithm: 'ES256', expiresIn: Math.round(config.graceHours * 3600) }),
    verify: (token) => app.jwt.verify<AccessClaims>(token, { key: config.accessPublicKey, algorithms: ['ES256'] }),
    publicKey: publicKeySpkiBase64(config.accessPublicKey),
  };
}
