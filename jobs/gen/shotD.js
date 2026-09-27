//# opis: przeglad pozostalych ekranow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const want = ['02c Teraz · szczegóły ogłoszenia','02e Teraz · zdjęcie dziecka','06 Oceny','11 Wiadomości · wysłane (pusto)','18 Plan · rok','19 Stan · ładowanie'];
let i = 0;
for (const n of want) { const f = sec.children.find(x => x.name === n); if (!f) continue; i++; progress(i/want.length, n); await shot(f, { scale: 0.75, name: 'vD-' + n.split(' ')[0] }); }
return want;
