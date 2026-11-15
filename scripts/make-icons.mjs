// Generates PNG app icons from the SVG sources in shared/assets.
// Uses Playwright's Chromium to rasterize SVG (no native SVG tools needed).
// Usage: node scripts/make-icons.mjs
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(root, 'shared/assets');
const OUT = join(A, 'icons');
mkdirSync(OUT, { recursive: true });

// Playwright is resolved globally (NODE_PATH) or from a local install.
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();

async function png(svgFile, size, outFile, { round = false } = {}) {
  const svg = readFileSync(join(A, svgFile), 'utf8');
  const radius = round ? '50%' : '0';
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body></html>`,
  );
  mkdirSync(dirname(outFile), { recursive: true });
  await page.screenshot({ path: outFile, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

for (const v of ['', 'admin-']) {
  await png(`${v}icon-full.svg`, 512, join(OUT, `${v}icon-512.png`));
  await png(`${v}icon-full.svg`, 192, join(OUT, `${v}icon-192.png`));
  await png(`${v}icon-full.svg`, 180, join(OUT, `${v}apple-touch-icon.png`));
  await png(`${v}mark.svg`, 32, join(OUT, `${v}favicon-32.png`));
}
await png('icon-maskable.svg', 512, join(OUT, 'maskable-512.png'));

// Android legacy launcher icons (API < 26). Adaptive icons use vector drawables in res/.
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [app, prefix] of [['proed-app', ''], ['proed-admin', 'admin-']]) {
  const res = join(root, app, 'android/app/src/main/res');
  if (!existsSync(res)) continue;
  for (const [d, s] of Object.entries(densities)) {
    await png(`${prefix}mark.svg`, s, join(res, `mipmap-${d}`, 'ic_launcher.png'));
    await png(`${prefix}icon-full.svg`, s, join(res, `mipmap-${d}`, 'ic_launcher_round.png'), { round: true });
  }
}

await browser.close();
console.log('icons done');
