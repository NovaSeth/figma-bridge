//# opis: kontrola ekranow po ostatnich poprawkach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const want = ['04 Zadania','07 Wiadomości · odebrane','14 Nowa wiadomość · błędy walidacji','02a Teraz · szczegóły na pełnym ekranie'];
let i = 0;
for (const n of want) { const f = sec.children.find(x => x.name === n); if (!f) continue; i++; progress(i/want.length, n); await shot(f, { scale: 0.8, name: 'vK-' + n.split(' ')[0] }); }
return want;
