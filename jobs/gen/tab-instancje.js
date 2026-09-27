//# opis: czy instancje paska zakladek przejely niebieski na aktywnej pozycji
await figma.loadAllPagesAsync();
const nazwa = async (id) => { const v = await figma.variables.getVariableByIdAsync(id); return v ? v.name : '?'; };
const opis = async (n) => {
  if (!n || !Array.isArray(n.fills) || !n.fills.length) return 'brak';
  const f = n.fills[0];
  return f.boundVariables && f.boundVariables.color ? await nazwa(f.boundVariables.color.id) : 'STALY KOLOR';
};
const wynik = { ekrany: [], podsumowanie: {} };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const sekcja of page.children.filter(c => c.type === 'SECTION')) {
  for (const ramka of sekcja.children.filter(c => c.type === 'FRAME')) {
    const pasek = ramka.findOne(n => n.type === 'INSTANCE' && /^tab bar$/i.test(n.name));
    if (!pasek || !('children' in pasek)) continue;
    for (const poz of pasek.children) {
      const p = poz.componentProperties || {};
      if (!p.Active || String(p.Active.value) !== 'True') continue;
      const napis = poz.findOne(n => n.type === 'TEXT' && n.name === 'Label');
      const wektory = poz.findAll(n => n.type === 'VECTOR' && !/badge/i.test(((n.parent || {}).name) || ''));
      const w = { sekcja: sekcja.name, ekran: ramka.name, zakladka: napis ? napis.characters : '?',
                  napis: await opis(napis), ikona: await opis(wektory[0]), wektorow: wektory.length };
      wynik.ekrany.push(w);
      const k = w.napis + ' / ' + w.ikona;
      wynik.podsumowanie[k] = (wynik.podsumowanie[k] || 0) + 1;
    }
  }
}
return wynik;
