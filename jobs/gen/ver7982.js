//# opis: weryfikacja 79-82
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const want = ['02 Teraz · szczegóły sprawy (arkusz)','02a Teraz · szczegóły na pełnym ekranie','02b Teraz · odpowiedź'];
const out = [];
for (const n of want) {
  const f = light.children.find(x => x.name === n);
  const sh = f.children.find(c => c.name === 'Bottom sheet');
  if (sh) sh.y = 874 - sh.height;
  await shot(f, { scale: 1, name: 'v8-' + n.split(' ')[0] });
  out.push({ n, sheetH: sh ? Math.round(sh.height) : null });
}
return out;
