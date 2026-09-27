//# opis: przeglad sekcji DS po zmianach
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const out = [];
let i = 0;
const sekcje = ds.children.filter(c => c.type === 'SECTION');
for (const s of sekcje) {
  i++; progress(i / sekcje.length, s.name);
  await shot(s, { scale: 0.3, name: 'vDSf-' + s.name.replace(/\s+/g, '_') });
  out.push({ n: s.name, w: Math.round(s.width), h: Math.round(s.height), dzieci: s.children.length });
}
return out;
