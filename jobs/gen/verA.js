//# opis: weryfikacja po poprawkach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const want = ['01 Teraz','07 Wiadomości · odebrane','17 Plan · miesiąc','19 Stan · ładowanie','20 Stan · błąd odświeżania','06 Oceny'];
let i = 0;
for (const n of want) {
  const f = sec.children.find(x => x.name === n);
  if (!f) continue;
  i++; progress(i / want.length, n);
  await shot(f, { scale: 1, name: 'vA-' + n.split(' ')[0] });
}
return want;
