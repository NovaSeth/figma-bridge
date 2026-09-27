//# opis: kontrola 06a po zmianie szkoly
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const f = sek.children.find(c => c.name === '06a Oceny · oceny cyfrowe');
  out.push(sek.name + ': ' + Math.round(f.height) + ' px, Raszyn w pliku: ' +
    f.findAll(n => n.type === 'TEXT' && /Raszyn/.test(n.characters)).length);
  await shot(f, { scale: 0.6, name: 'FIN-06a-' + (sek.name === 'Ciemny motyw' ? 'ciemny' : 'jasny') });
  const nota = sek.children.find(c => c.type === 'TEXT' && c.name === 'Doc · 02k Frekwencja · rok');
  out.push(sek.name + ' / nota 02k: ' + (nota ? 'jest @' + Math.round(nota.x) + ',' + Math.round(nota.y) : 'BRAK'));
}
return out;
