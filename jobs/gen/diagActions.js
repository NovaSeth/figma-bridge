//# opis: struktura arkusza 02 (akcje)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
let out = null;
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.name !== '02 Teraz · szczegóły sprawy (arkusz)') continue;
  const sheet = f.children.find(c => c.name === 'Bottom sheet');
  out = { kids: sheet.children.map(c => ({ n: c.name, t: c.type, h: Math.round(c.height) })) };
  const body = sheet.children.find(c => c.name === 'Body');
  out.body = body.children.map(c => ({ n: c.name, t: c.type, h: Math.round(c.height), kids: 'children' in c ? c.children.map(k => k.name + ':' + k.type) : null }));
}
return out;
