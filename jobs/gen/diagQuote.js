//# opis: gdzie zostaly proste cudzyslowy
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const out = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const t of f.findAll(n => n.type === 'TEXT' && n.characters.indexOf('"') >= 0)) {
    out.push({ screen: f.name, id: t.id, v: t.characters.slice(0, 70), kody: t.characters.split('').filter(c => c === '"' || c === '„' || c === '”').map(c => c.charCodeAt(0)) });
  }
}
// 21 Stan pusto
const f21 = sec.children.find(x => x.name === '21 Stan · pusto (Teraz)');
const m21 = f21.children.find(c => c.name === 'Main Content');
return { cudzyslowy: out.slice(0, 8), n: out.length, f21: { align: m21.primaryAxisAlignItems, h: Math.round(m21.height), kids: m21.children.map(c => c.name + ':' + Math.round(c.height) + ':' + c.layoutSizingVertical) } };
