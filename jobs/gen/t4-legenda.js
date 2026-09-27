//# opis: legenda 02i w jednym wierszu - pomiar szerokosci chipow i proba odstepu 6 px
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const f = sek.children.find(c => c.name === '02i Frekwencja · z nieobecnościami');
  const main = f.children.find(c => c.name === 'Main Content');
  const leg = main.children.find(c => c.name === 'Legenda');
  const chipy = leg.children.filter(c => c.type === 'INSTANCE');
  const szer = chipy.map(c => Math.round(c.width));
  const suma = szer.reduce((a, b) => a + b, 0);
  leg.itemSpacing = 6;
  const ost = main.children[main.children.length - 1];
  wynik.push({ sekcja: sek.name, chipy: szer.join('+') + ' = ' + suma,
    potrzeba: suma + 3 * 6, dostepne: Math.round(leg.width),
    legendaH: Math.round(leg.height), wierszy: leg.height > 60 ? 2 : 1,
    dolTresci: Math.round(ost.y + ost.height), margines: Math.round(874 - (ost.y + ost.height)) });
  if (sek.name === 'Jasny motyw') await shot(leg, { scale: 2, name: 't4-legenda-6px' });
}
return wynik;
