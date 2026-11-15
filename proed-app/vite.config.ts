import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const serverTarget = process.env.PROED_DEV_SERVER ?? 'http://localhost:8787';

/** Writes the list of built files into dist/sw.js so the service worker can precache the app shell. */
function swPrecache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'proed-sw-precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      if (!existsSync(swPath)) return;
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else files.push('/' + relative(outDir, full).split('\\').join('/'));
        }
      };
      walk(outDir);
      const list = files
        .filter((f) => f !== '/sw.js' && !f.endsWith('.map'))
        // Only the latin font subsets are precached; others load on demand if ever needed.
        .filter((f) => !/inter-(cyrillic|greek|vietnamese)/.test(f))
        .sort();
      const hash = createHash('sha256');
      for (const f of list) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      const sw = readFileSync(swPath, 'utf8')
        .replace('self.__PRECACHE__', JSON.stringify(list))
        .replace('__SW_VERSION__', version);
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swPrecache()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': serverTarget,
      '/relay': serverTarget,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
