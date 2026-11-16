import { assertSecrets, loadConfig } from './config.js';
import { buildApp } from './app.js';
import { openDb, prepareSqlite, pruneOldData } from './db.js';

const config = loadConfig();
assertSecrets(config);
await prepareSqlite();
const db = openDb(config.dataDir);
console.log(`ProEd server: SQLite driver ${db.driver}`);
pruneOldData(db);
setInterval(() => pruneOldData(db), 24 * 3600_000).unref();
const app = await buildApp({ config, db });

try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    app.close().then(() => {
      db.close();
      process.exit(0);
    });
  });
}
