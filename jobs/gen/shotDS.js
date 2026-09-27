//# opis: przeglad stron DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const sekcje = ds.children.filter(c => c.type === 'SECTION');
const out = [];
let i = 0;
for (const s of sekcje) {
  i++; progress(i / sekcje.length, s.name);
  await shot(s, { scale: 0.35, name: 'vDS-sekcja-' + s.name.replace(/\s+/g, '_') });
  out.push({ n: s.name, w: Math.round(s.width), h: Math.round(s.height) });
}
return out;
