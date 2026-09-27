//# opis: kontrola po poprawkach 100-103
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const pre = sek.name === 'Ciemny motyw' ? 'd' : 'l';
  for (const n of ['03 Teraz · sprawy zamknięte', '08 Wiadomość · wątek', '02f Teraz · frekwencja']) {
    const f = sek.children.find(x => x.name === n);
    if (!f) continue;
    await shot(f, { scale: 0.6, name: 'vE5-' + pre + '-' + n.split(' ')[0] });
    out.push(pre + ' ' + n + ': ' + Math.round(f.width) + 'x' + Math.round(f.height));
  }
}
return out;
