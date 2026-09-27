//# opis: aktywna zakladka - ikona i napis na color/primary (uwaga Michala 1933598144)
await figma.loadAllPagesAsync();
const zmienne = await figma.variables.getLocalVariablesAsync('COLOR');
const primary = zmienne.find(v => v.name === 'color/primary');
if (!primary) throw new Error('brak zmiennej color/primary');

const pomaluj = (wezel) => {
  const f = JSON.parse(JSON.stringify(wezel.fills));
  f[0] = figma.variables.setBoundVariableForPaint(f[0], 'color', primary);
  wezel.fills = f;
};

const raport = { zmienione: [], pominiete: [] };
for (const k of figma.root.findAllWithCriteria({ types: ['COMPONENT_SET'] })) {
  if (k.name !== 'Tab item') continue;
  const aktywny = k.children.find(c => c.name === 'Active=True');
  if (!aktywny) throw new Error('brak wariantu Active=True');

  const napis = aktywny.findOne(n => n.type === 'TEXT' && n.name === 'Label');
  if (napis) { pomaluj(napis); raport.zmienione.push('Label'); } else raport.pominiete.push('Label');

  // Ikona to instancja komponentu ikony; kolor niesie wektor w srodku.
  for (const v of aktywny.findAll(n => n.type === 'VECTOR')) {
    // Licznik powiadomien ma zostac czerwony - malujemy tylko wektory ikony.
    if (v.parent && /badge/i.test(v.parent.name)) { raport.pominiete.push('Vector w Badge'); continue; }
    pomaluj(v);
    raport.zmienione.push('Vector w ' + (v.parent ? v.parent.name : '?'));
  }
  aktywny.description = 'Aktywna zakladka: ikona i napis chodza po color/primary, pigulka po '
    + 'color/primary-container. Sam napis w color/on-surface nie czytal sie jako czesc '
    + 'zaznaczenia - jedynym niebieskim elementem byla pigulka (uwaga Michala, 2026-09-20).';
}
return raport;
