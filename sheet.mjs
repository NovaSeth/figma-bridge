// Arkusz porównawczy: kafelki ekranów z etykietami. node sheet.mjs <katalog> <prefiks> [na-arkusz]
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/Users/michal/Documents/Code/FLibrus/package.json');
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'out', process.argv[2] || 'after'), prefix = process.argv[3] || 'sheet', per = +(process.argv[4] || 8);
const files = readdirSync(dir).filter(f => f.endsWith('.png')).sort();
const browser = await chromium.launch();
for (let i = 0; i < files.length; i += per) {
  const part = files.slice(i, i + per);
  const cells = part.map(f => `<figure><img src="data:image/png;base64,${readFileSync(join(dir, f)).toString('base64')}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`).join('');
  const page = await browser.newPage({ viewport: { width: 1720, height: 1200 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>body{margin:0;background:#fff;font:12px Inter,system-ui;display:flex;flex-wrap:wrap;gap:10px;padding:10px}
    figure{margin:0;width:200px}img{width:200px;display:block;border:1px solid #ddd}figcaption{padding:3px 0;font-weight:600}</style>${cells}`);
  await page.screenshot({ path: join(here, 'out', `${prefix}-${i / per + 1}.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log('arkusze:', Math.ceil(files.length / per));
