//# opis: zrzuty ekranow 13, 14 i 06 do sprawdzenia stanu faktycznego
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sek = page.children.find(c => c.type === 'SECTION' && c.name === 'Jasny motyw');
const out = [];
for (const nazwa of ['13 Nowa wiadomość', '14 Nowa wiadomość · błędy walidacji', '06 Oceny']) {
  const f = sek.children.find(x => x.name === nazwa);
  if (!f) { out.push({ nazwa, stan: 'BRAK' }); continue; }
  const main = f.children.find(c => c.name === 'Main Content');
  out.push({
    nazwa,
    wysokosc: Math.round(f.height),
    dzieciRamki: f.children.map(c => c.name),
    dzieciMain: main ? main.children.map(c => `${c.name} (${c.type})`) : null,
  });
  await shot(f, { scale: 1, name: nazwa.replace(/[^\w]+/g, '_') });
}
return out;
