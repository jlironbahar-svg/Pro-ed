import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const API_PREFIXES = ['/api', '/admin', '/relay', '/download', '/healthz'];

/** Serves the built PWA (proed-app/dist) with an SPA fallback to index.html. */
export async function pwaRoutes(app: FastifyInstance, opts: { root: string }): Promise<void> {
  if (!existsSync(join(opts.root, 'index.html'))) {
    app.log.warn(`PWA build not found in ${opts.root}. Run "npm run build -w proed-app".`);
    return;
  }

  await app.register(fastifyStatic, {
    root: opts.root,
    wildcard: false,
    cacheControl: false,
    setHeaders(reply, path) {
      // Hashed assets never change. Everything else must be revalidated (index.html, sw.js, manifest).
      reply.header('cache-control', /[\\/]assets[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache');
      if (path.endsWith('sw.js')) reply.header('service-worker-allowed', '/');
    },
  });

  app.setNotFoundHandler((req, reply) => {
    const path = req.url.split('?')[0];
    if (req.method !== 'GET' || API_PREFIXES.some((p) => path.startsWith(p)) || /\.[a-z0-9]+$/i.test(path)) {
      return reply.code(404).send({ error: 'not_found' });
    }
    reply.header('cache-control', 'no-cache');
    return reply.sendFile('index.html');
  });
}
