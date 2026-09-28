// Contact sheet: labelled screenshot tiles, e.g. of out/before or out/after from tools/snapshot.mjs.
// Usage: node tools/sheet.mjs <dir under out/> <prefix> [per-sheet]   → out/<prefix>-1.png, out/<prefix>-2.png, …
// out/ is the one in the bridge's data directory (paths.mjs).
// Needs Playwright, an optional dependency: npm install playwright
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { codeDir as bridge, dataDir } from '../paths.mjs';

// The bridge's own node_modules first, then the project the command runs from.
const loadPlaywright = () => {
  for (const base of [bridge, process.cwd()]) {
    // only playwright itself missing means "try the next place"; a broken install must say so
    try { return createRequire(join(base, 'package.json'))('playwright'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND' || !/'playwright'/.test(e.message)) throw e; }
  }
  console.error(`Brak Playwrighta. Uruchom \`npm install playwright\` w ${bridge}, a jeśli zabraknie przeglądarki, \`npx playwright install chromium\`.`);
  process.exit(1);
};
const { chromium } = loadPlaywright();
const out = join(dataDir(), 'out'), dir = join(out, process.argv[2] || 'after'), prefix = process.argv[3] || 'sheet', per = +(process.argv[4] || 8);
const files = readdirSync(dir).filter(f => f.endsWith('.png')).sort();
const browser = await chromium.launch();
for (let i = 0; i < files.length; i += per) {
  const part = files.slice(i, i + per);
  const cells = part.map(f => `<figure><img src="data:image/png;base64,${readFileSync(join(dir, f)).toString('base64')}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`).join('');
  const page = await browser.newPage({ viewport: { width: 1720, height: 1200 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>body{margin:0;background:#fff;font:12px Inter,system-ui;display:flex;flex-wrap:wrap;gap:10px;padding:10px}
    figure{margin:0;width:200px}img{width:200px;display:block;border:1px solid #ddd}figcaption{padding:3px 0;font-weight:600}</style>${cells}`);
  await page.screenshot({ path: join(out, `${prefix}-${i / per + 1}.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log('arkusze:', Math.ceil(files.length / per));
