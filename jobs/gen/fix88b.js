//# opis: pasek caly dzien - wymuszenie wysokosci tresci
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const grid = f.findOne(n => n.type === 'FRAME' && n.name === 'TimeGrid');
  if (!grid) continue;
  const c = grid.children.find(x => x.layoutPositioning !== 'ABSOLUTE' && x.findOne && x.findOne(n => /Cały dzień/.test(n.name)));
  if (!c) continue;
  const lista = c.children.find(k => /^List - Cały dzień/.test(k.name));
  const kolumna = c.children.find(k => k.name === 'Text');
  const przed = Math.round(c.height);
  if (kolumna) { kolumna.layoutSizingVertical = 'HUG'; kolumna.layoutAlign = 'MIN'; }
  c.counterAxisAlignItems = 'MIN';
  if (kolumna) { kolumna.layoutSizingVertical = 'FIXED'; kolumna.resize(kolumna.width, lista ? lista.height : kolumna.height); }
  c.layoutSizingVertical = 'FIXED';
  c.resize(c.width, lista ? lista.height : c.height);
  const po = Math.round(c.height);
  const linie = grid.children.find(x => x.name === 'Hour lines');
  if (linie) linie.y = po;
  const dolny = grid.children.find(x => x.layoutPositioning !== 'ABSOLUTE' && x !== c);
  log.push({ screen: f.name, przed, po, lista: lista ? Math.round(lista.height) : null });
  await shot(grid, { scale: 0.8, name: 'vAD-' + f.name.split(' ')[0] });
}
return log;
