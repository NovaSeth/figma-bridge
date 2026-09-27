//# opis: aktywna zakladka niebieska na WSZYSTKICH instancjach (ikona jest swapem, ciemny ma nadpisania)
await figma.loadAllPagesAsync();
const zmienne = await figma.variables.getLocalVariablesAsync('COLOR');
const primary = zmienne.find(v => v.name === 'color/primary');
if (!primary) throw new Error('brak color/primary');

const pomaluj = (n) => {
  if (!n || !Array.isArray(n.fills) || !n.fills.length) return false;
  const f = JSON.parse(JSON.stringify(n.fills));
  f[0] = figma.variables.setBoundVariableForPaint(f[0], 'color', primary);
  n.fills = f;
  return true;
};

const raport = { napisy: 0, ikony: 0, pominiete: [], ekranow: 0 };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const sekcja of page.children.filter(c => c.type === 'SECTION')) {
  for (const ramka of sekcja.children.filter(c => c.type === 'FRAME')) {
    const pasek = ramka.findOne(n => n.type === 'INSTANCE' && /^tab bar$/i.test(n.name));
    if (!pasek || !('children' in pasek)) continue;
    let dotknieto = false;
    for (const poz of pasek.children) {
      const p = poz.componentProperties || {};
      if (!p.Active || String(p.Active.value) !== 'True') continue;
      const napis = poz.findOne(n => n.type === 'TEXT' && n.name === 'Label');
      if (pomaluj(napis)) { raport.napisy++; dotknieto = true; }
      // Licznik powiadomien zostaje czerwony - omijamy wektory wewnatrz Badge.
      for (const v of poz.findAll(n => n.type === 'VECTOR' && !/badge/i.test(((n.parent || {}).name) || ''))) {
        if (pomaluj(v)) { raport.ikony++; dotknieto = true; }
        else raport.pominiete.push(ramka.name + ' / wektor bez wypelnienia');
      }
    }
    if (dotknieto) raport.ekranow++;
  }
}
return raport;
