//# opis: rozpoznanie aktywnej zakladki - co maluje ikone i napis
await figma.loadAllPagesAsync();
const nazwaZmiennej = async (id) => { const v = await figma.variables.getVariableByIdAsync(id); return v ? v.name : '?'; };
const wynik = { znalezione: [] };
for (const k of figma.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) {
  if (!/tab/i.test(k.name)) continue;
  const opis = { nazwa: k.name, typ: k.type, id: k.id, dzieci: [] };
  const zejdz = async (n, gl) => {
    if (gl > 4) return;
    const w = { gl, nazwa: n.name, typ: n.type };
    if ('fills' in n && Array.isArray(n.fills) && n.fills.length) {
      const opisy = [];
      for (const f of n.fills) {
        if (f.boundVariables && f.boundVariables.color) opisy.push('zmienna:' + await nazwaZmiennej(f.boundVariables.color.id));
        else opisy.push(f.type === 'SOLID' ? 'stały' : f.type);
      }
      w.wypelnienie = opisy.join(', ');
    }
    if (n.type === 'TEXT') w.tekst = n.characters;
    opis.dzieci.push(w);
    if ('children' in n) for (const c of n.children) await zejdz(c, gl + 1);
  };
  await zejdz(k, 0);
  wynik.znalezione.push(opis);
}
return wynik;
