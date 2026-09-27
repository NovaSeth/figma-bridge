//# opis: przelacznik widoku na ekranie 24
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f24 = sec.children.find(x => x.name === '24 Stan · pusto (Plan)');
const f15 = sec.children.find(x => x.name === '15 Plan · dzień');
const m24 = f24.children.find(c => c.name === 'Main Content');
const m15 = f15.children.find(c => c.name === 'Main Content');
const maSeg = m24.findOne(n => n.type === 'INSTANCE' && n.name === 'Segmented control');
let dodane = 'już był';
if (!maSeg) {
  const src = m15.children.find(c => c.findOne && c.findOne(n => n.type === 'INSTANCE' && n.name === 'Segmented control'));
  const k = src.clone();
  m24.insertChild(1, k);
  k.layoutSizingHorizontal = 'FILL';
  dodane = 'dodany ' + Math.round(k.height) + ' px';
}
await shot(f24, { scale: 1, name: 'vA-24' });
return { dodane, kids: m24.children.map(c => c.name + ':' + Math.round(c.height)) };
