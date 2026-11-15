import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const API_PREFIXES = ['/api', '/admin', '/relay', '/download', '/healthz'];
const CONSOLE = '/console';

function cacheHeaders(reply: { header: (k: string, v: string) => unknown }, path: string): void {
  // Hashed assets never change. Everything else must be revalidated (index.html, sw.js, manifest).
  reply.header('cache-control', /[\\/]assets[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache');
}

/**
 * Serves the built PWA (proed-app/dist) at / and the web version of ProEd Admin
 * (proed-admin/dist-web) at /console/, each with an SPA fallback to its index.html.
 */
export async function pwaRoutes(app: FastifyInstance, opts: { root: string; adminRoot: string }): Promise<void> {
  const hasPwa = existsSync(join(opts.root, 'index.html'));
  const hasAdmin = existsSync(join(opts.adminRoot, 'index.html'));
  if (!hasPwa) app.log.warn(`PWA build not found in ${opts.root}. Run "npm run build -w proed-app".`);
  if (!hasAdmin) app.log.info(`Admin web build not found in ${opts.adminRoot}. Run "npm run build:web -w proed-admin".`);

  if (hasPwa) {
    await app.register(fastifyStatic, {
      root: opts.root,
      wildcard: false,
      cacheControl: false,
      setHeaders(reply, path) {
        cacheHeaders(reply, path);
        if (path.endsWith('sw.js')) reply.header('service-worker-allowed', '/');
      },
    });
  }
  if (hasAdmin) {
    await app.register(fastifyStatic, {
      root: opts.adminRoot,
      prefix: `${CONSOLE}/`,
      wildcard: false,
      cacheControl: false,
      decorateReply: !hasPwa,
      setHeaders: cacheHeaders,
    });
    app.get(CONSOLE, (_req, reply) => reply.redirect(`${CONSOLE}/`));
  }

  app.setNotFoundHandler((req, reply) => {
    const path = req.url.split('?')[0];
    if (hasAdmin && req.method === 'GET' && path.startsWith(`${CONSOLE}/`) && !/\.[a-z0-9]+$/i.test(path)) {
      reply.header('cache-control', 'no-cache').header('x-robots-tag', 'noindex');
      return reply.sendFile('index.html', opts.adminRoot);
    }
    if (!hasPwa || req.method !== 'GET' || API_PREFIXES.some((p) => path.startsWith(p)) || /\.[a-z0-9]+$/i.test(path)) {
      return reply.code(404).send({ error: 'not_found' });
    }
    reply.header('cache-control', 'no-cache');
    return reply.sendFile('index.html', opts.root);
  });
}
