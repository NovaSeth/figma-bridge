//# opis: nawigacja Planu na ekranie pustym + weryfikacja
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f24 = sec.children.find(x => x.name === '24 Stan · pusto (Plan)');
const f15 = sec.children.find(x => x.name === '15 Plan · dzień');
const m24 = f24.children.find(c => c.name === 'Main Content');
const m15 = f15.children.find(c => c.name === 'Main Content');
const log = [];
// pasek daty i przełącznik widoku jak na pozostałych ekranach Planu
const wanted = m15.children.filter(c => /Date nav|Segmented|Day nav|Plan nav|Month bar/i.test(c.name) || c.name === 'Nav');
log.push({ m15: m15.children.map(c => c.name), znalezione: wanted.map(c => c.name) });
let i = 0;
for (const w of wanted) {
  if (m24.children.find(c => c.name === w.name)) continue;
  const k = w.clone();
  m24.insertChild(i++, k);
  k.layoutSizingHorizontal = 'FILL';
  log.push({ dodane: k.name, h: Math.round(k.height) });
}
await shot(f24, { scale: 1, name: 'vA-24' });
return log;
