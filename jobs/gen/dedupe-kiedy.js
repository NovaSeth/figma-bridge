//# Usunięcie zdublowanego pola „Kiedy" (skutek przerwanego uruchomienia)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
let removed = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME' && n.name.startsWith('15a'))) {
  const body = f.findOne(n => n.name === 'Body'); if (!body) continue;
  const fields = body.children.filter(c => T(c).some(t => t.characters === 'Kiedy'));
  for (const extra of fields.slice(1)) { extra.remove(); removed++; }
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); if (sheet) sheet.y = f.height - sheet.height;
  await shot(f, { name: 'c-15a', scale: 0.5 });
}
return { removed };
