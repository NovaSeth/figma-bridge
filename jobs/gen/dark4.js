//# opis: podglad ciemnych ekranow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sekcja = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
const want = ['01 Teraz', '07 Wiadomości · odebrane', '02f Teraz · frekwencja', '13 Nowa wiadomość'];
let i = 0;
for (const n of want) {
  const f = sekcja.children.find(x => x.name === n);
  if (!f) continue;
  i++; progress(i / want.length, n);
  await shot(f, { scale: 0.6, name: 'vD1-' + n.split(' ')[0] });
}
return sekcja.children.filter(c => c.type === 'FRAME').map(c => c.name).slice(0, 5);
