//# opis: screeny do 78-82
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const want = ['02 Teraz · szczegóły sprawy (arkusz)','02a Teraz · szczegóły na pełnym ekranie','02b Teraz · odpowiedź','02f Teraz · frekwencja','02g Teraz · ustawienia'];
const out = [];
let i = 0;
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (want.indexOf(f.name) < 0) continue;
  i++; progress(i / want.length, f.name);
  await shot(f, { scale: 1, name: 'c8-' + f.name.split(' ')[0] });
  out.push({ n: f.name, h: Math.round(f.height) });
}
return out;
