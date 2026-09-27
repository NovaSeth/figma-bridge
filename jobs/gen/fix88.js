//# opis: #88 pasek "caly dzien" bez pustego zapasu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const grid = f.findOne(n => n.type === 'FRAME' && n.name === 'TimeGrid');
  if (!grid) continue;
  const calyDzien = grid.children.find(c => c.layoutPositioning !== 'ABSOLUTE' && c.findOne && c.findOne(n => /Cały dzień/.test(n.name)));
  if (!calyDzien) continue;
  const przed = Math.round(calyDzien.height);
  calyDzien.layoutSizingVertical = 'HUG';
  const po = Math.round(calyDzien.height);
  // linie godzin startuja tam, gdzie konczy sie pasek
  const linie = grid.children.find(c => c.name === 'Hour lines');
  if (linie) linie.y = po;
  log.push({ screen: f.name, przed, po });
  await shot(f, { scale: 0.6, name: 'vAC-' + f.name.split(' ')[0] });
}
return log;
