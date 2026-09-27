//# opis: walidacja systemu projektowego
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const style = await figma.getLocalTextStylesAsync();
const efekty = await figma.getLocalEffectStylesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });

const blad = { opisy: [], warianty: [], refy: [], teksty: [], kolory: [], pozaTablica: [], zmienne: [], style: [] };

// 1. komponenty: opis, warianty, powiazania
const zestawy = ds.findAll(n => n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && (!n.parent || n.parent.type !== 'COMPONENT_SET')));
const naTablicy = new Set();
for (const s of ds.children.filter(c => c.type === 'SECTION')) {
  const board = s.children.find(c => c.name === 'Board');
  if (!board) continue;
  for (const d of board.children) {
    for (const k of (d.children || [])) if (k.type === 'COMPONENT_SET' || k.type === 'COMPONENT') naTablicy.add(k.id);
  }
}
for (const s of zestawy) {
  if (!s.description || !s.description.trim()) blad.opisy.push(s.name);
  if (!naTablicy.has(s.id)) blad.pozaTablica.push(s.name);
  if (s.type === 'COMPONENT_SET') {
    // spójność osi wariantów
    const osie = s.children.map(c => c.name.split(',').map(x => x.split('=')[0].trim()).sort().join('|'));
    if (new Set(osie).size > 1) blad.warianty.push({ set: s.name, osie: [...new Set(osie)] });
    if (s.children.some(c => /Property \d/.test(c.name))) blad.warianty.push({ set: s.name, problem: 'nazwa Property N' });
    // pełna macierz
    const props = {};
    for (const c of s.children) for (const para of c.name.split(',')) { const [k, v] = para.split('='); if (k && v) (props[k.trim()] = props[k.trim()] || new Set()).add(v.trim()); }
    const klucze = Object.keys(props);
    if (klucze.length > 1) {
      const spodziewane = klucze.reduce((a, k) => a * props[k].size, 1);
      if (s.children.length !== spodziewane) blad.warianty.push({ set: s.name, jest: s.children.length, spodziewane });
    }
    // powiązania właściwości w każdym wariancie
    const defs = Object.keys(s.componentPropertyDefinitions);
    const tekstowe = defs.filter(k => s.componentPropertyDefinitions[k].type === 'TEXT');
    for (const c of s.children) {
      for (const k of tekstowe) {
        const ma = c.findAll(n => n.componentPropertyReferences && n.componentPropertyReferences.characters === k).length;
        if (!ma) blad.refy.push(c.name + ' w ' + s.name + ' nie ma warstwy dla ' + k.split('#')[0]);
      }
    }
  }
  // teksty i kolory wewnątrz komponentu
  for (const n of s.findAll(() => true)) {
    if (n.type === 'TEXT' && (!n.textStyleId || n.textStyleId === figma.mixed)) blad.teksty.push(s.name + ' / ' + n.name);
    if ('fills' in n && n.fills && n.fills !== figma.mixed && n.fills.some(f => f.visible !== false && f.type === 'SOLID')) {
      const b = n.boundVariables && n.boundVariables.fills && n.boundVariables.fills.length;
      if (!b) blad.kolory.push(s.name + ' / ' + n.name);
    }
  }
}
// 2. zmienne
for (const v of wszystkie) {
  const c = kolById[v.variableCollectionId];
  const prymityw = c && c.name === 'Primitives';
  if (!prymityw && (!v.scopes || v.scopes.length === 0 || v.scopes.indexOf('ALL_SCOPES') >= 0)) blad.zmienne.push(v.name + ' (' + (c ? c.name : '?') + '): zakres');
  if (!prymityw && v.resolvedType === 'COLOR') {
    const w = v.valuesByMode[c.modes[0].modeId];
    if (w && w.type !== 'VARIABLE_ALIAS') blad.zmienne.push(v.name + ': wartość wprost zamiast aliasu');
  }
  const cs = v.codeSyntax || {};
  if (!prymityw && !cs.WEB) blad.zmienne.push(v.name + ': brak składni WEB');
}
// 3. style tekstu bez opisu
for (const s of style) if (!s.description || !s.description.trim()) blad.style.push('tekst: ' + s.name);
for (const s of efekty) if (!s.description || !s.description.trim()) blad.style.push('efekt: ' + s.name);
const skrot = o => { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = Array.isArray(v) ? v.length : v; return r; };
return { liczby: { zestawy: zestawy.length, zmienne: wszystkie.length, styleTekstu: style.length, styleEfektow: efekty.length }, ile: skrot(blad), blad: {
  opisy: blad.opisy, pozaTablica: blad.pozaTablica, warianty: blad.warianty, refy: blad.refy.slice(0, 10),
  teksty: blad.teksty.slice(0, 10), kolory: blad.kolory.slice(0, 10), zmienne: blad.zmienne.slice(0, 12), style: blad.style.slice(0, 10) } };
