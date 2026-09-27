//# opis: weryfikacja 83 i 84
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const want = ['05 Zadania · zrobione i archiwum','02 Teraz · szczegóły sprawy (arkusz)','13 Nowa wiadomość','15b Plan · szczegóły oferty zajęć'];
let i = 0;
for (const n of want) {
  const f = sec.children.find(x => x.name === n);
  if (!f) continue;
  i++; progress(i / want.length, n);
  const sh = f.children.find(c => c.name === 'Bottom sheet');
  if (sh) sh.y = 874 - sh.height;
  await shot(f, { scale: 0.8, name: 'vF-' + n.split(' ')[0] });
}
return want;
