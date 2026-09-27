//# opis: struktura arkusza 15a i 02c
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
function tree(n, d, max) {
  const o = { n: n.name, t: n.type, h: Math.round(n.height) };
  if (n.type === 'TEXT') o.v = n.characters;
  if (n.type === 'INSTANCE' && n.componentProperties) o.p = Object.keys(n.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(n.componentProperties[k].value)).join(' | ');
  if (d < max && 'children' in n) o.c = n.children.map(c => tree(c, d + 1, max));
  return o;
}
const out = {};
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.name === '15a Plan · nowe zajęcia' || f.name === '02c Teraz · szczegóły ogłoszenia') {
    const sheet = f.children.find(c => c.name.indexOf('sheet') >= 0 || c.name.indexOf('Sheet') >= 0);
    out[f.name] = { frame: { x: Math.round(f.x), y: Math.round(f.y), w: f.width, h: Math.round(f.height) }, sheet: sheet ? tree(sheet, 0, 3) : null };
  }
}
return out;
