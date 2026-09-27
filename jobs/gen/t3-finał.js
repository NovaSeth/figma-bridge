//# opis: zrzuty koncowe szesciu ekranow frekwencji
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const przyr = sek.name === 'Ciemny motyw' ? 'ciemny' : 'jasny';
  for (const [nz, skrot] of [['02i Frekwencja · z nieobecnościami', '02i'],
                             ['02j Frekwencja · szczegóły dnia z nieobecnością', '02j'],
                             ['02k Frekwencja · rok', '02k']]) {
    const f = sek.children.find(c => c.name === nz);
    if (!f) { out.push('BRAK ' + nz + ' w ' + sek.name); continue; }
    await shot(f, { scale: 1, name: 'FIN-' + skrot + '-' + przyr });
    out.push(nz + ' / ' + sek.name + ': ' + Math.round(f.width) + 'x' + Math.round(f.height) + ' @' + Math.round(f.x) + ',' + Math.round(f.y));
  }
}
return out;
