import type { FastifyInstance } from 'fastify';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { DB } from '../db.js';
import { getSetting } from '../repo.js';

/** Latest ProEd APK uploaded from the admin app. */
export async function downloadRoutes(app: FastifyInstance, opts: { db: DB; dataDir: string }): Promise<void> {
  app.get('/download/proed.apk', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (_req, reply) => {
    const file = getSetting(opts.db, 'apk_file');
    const version = getSetting(opts.db, 'apk_version') ?? 'latest';
    const path = file ? join(opts.dataDir, 'apk', file) : '';
    if (!path || !existsSync(path)) return reply.code(404).send({ error: 'no_apk' });
    reply
      .header('content-type', 'application/vnd.android.package-archive')
      .header('content-length', String(statSync(path).size))
      .header('content-disposition', `attachment; filename="ProEd-${version}.apk"`)
      .header('cache-control', 'no-cache');
    return reply.send(createReadStream(path));
  });
}
