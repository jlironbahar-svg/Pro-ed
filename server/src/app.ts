import Fastify, { LogController, type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import type { Config } from './config.js';
import type { DB } from './db.js';
import { accessTokens } from './lib/tokens.js';
import { relayRoutes } from './routes/relay.js';
import { pwaRoutes } from './routes/pwa.js';
import { apiRoutes } from './routes/api.js';
import { downloadRoutes } from './routes/download.js';
import { adminRoutes } from './routes/admin.js';

export interface AppDeps {
  config: Config;
  db: DB;
}

export async function buildApp({ config, db }: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: config.trustProxy,
    bodyLimit: 256 * 1024,
    logger: {
      level: config.logLevel,
      // Only method and path are logged: no bodies, no query strings, no headers (tokens stay out of logs).
      serializers: {
        req: (req) => ({ method: req.method, path: req.url.split('?')[0] }),
        res: (res) => ({ status: res.statusCode }),
      },
      redact: ['req.headers.authorization', 'req.headers.cookie', 'body', 'password', 'totp', 'token'],
    },
    logController: new LogController({ disableRequestLogging: config.logLevel !== 'debug' }),
  });

  // HTTPS only in production: behind a proxy (Fly.io, Render...) redirect plain HTTP.
  app.addHook('onRequest', async (req, reply) => {
    if (config.forceHttps && req.headers['x-forwarded-proto'] === 'http' && req.url !== '/healthz') {
      return reply.redirect(`https://${req.headers.host}${req.url}`, 301);
    }
  });

  // CORS for the Android apps (Capacitor origin https://localhost) on the API routes only.
  app.addHook('onRequest', async (req, reply) => {
    const origin = req.headers.origin;
    const path = req.url;
    if (!origin || !(path.startsWith('/api/') || path.startsWith('/admin/'))) return;
    if (!config.corsOrigins.includes(origin) && origin !== config.publicUrl) return;
    reply.header('access-control-allow-origin', origin);
    reply.header('vary', 'Origin');
    if (req.method === 'OPTIONS') {
      reply.header('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      reply.header('access-control-allow-headers', 'content-type, authorization');
      reply.header('access-control-max-age', '600');
      return reply.code(204).send();
    }
  });

  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('x-frame-options', 'DENY');
    if (config.forceHttps) reply.header('strict-transport-security', 'max-age=31536000');
    return payload;
  });

  await app.register(rateLimit, { global: true, max: 600, timeWindow: '1 minute' });

  // Admin sessions: HS256 with ADMIN_JWT_SECRET. Access tokens use their own ES256 keys (lib/tokens.ts).
  await app.register(fastifyJwt, {
    secret: config.adminJwtSecret,
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });
  const tokens = accessTokens(app, config);

  app.get('/healthz', { config: { rateLimit: false } }, async () => ({ ok: true }));

  await app.register(apiRoutes, { db, config, tokens });
  await app.register(downloadRoutes, { db, dataDir: config.dataDir });
  await app.register(adminRoutes, { db, config });
  await app.register(relayRoutes, { extraHosts: config.relayExtraHosts });
  await app.register(pwaRoutes, { root: config.pwaDir });

  return app;
}
