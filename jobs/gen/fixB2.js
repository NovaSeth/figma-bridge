//# opis: nawigacja Planu na ekranie pustym (24)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f24 = sec.children.find(x => x.name === '24 Stan · pusto (Plan)');
const f15 = sec.children.find(x => x.name === '15 Plan · dzień');
const m24 = f24.children.find(c => c.name === 'Main Content');
const m15 = f15.children.find(c => c.name === 'Main Content');
const opis = m15.children.map((c, i) => ({ i, n: c.name, h: Math.round(c.height), kids: 'children' in c ? c.children.map(k => k.name + ':' + k.type) : null }));
// pierwsze dwa bloki to nawigacja daty i przełącznik widoku
const log = { opis: opis.slice(0, 4), dodane: [] };
let at = 0;
for (let i = 0; i < 2; i++) {
  const src = m15.children[i];
  if (!src) continue;
  if (m24.children.find(c => c.name === src.name && Math.abs(c.height - src.height) < 2)) continue;
  const k = src.clone();
  m24.insertChild(at++, k);
  k.layoutSizingHorizontal = 'FILL';
  log.dodane.push(k.name + ':' + Math.round(k.height));
}
await shot(f24, { scale: 1, name: 'vA-24' });
return log;
