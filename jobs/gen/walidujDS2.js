//# opis: walidacja DS - wersja bez falszywych alarmow
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const style = await figma.getLocalTextStylesAsync();
const efekty = await figma.getLocalEffectStylesAsync();
const b = { opisy: [], refy: [], teksty: [], kolory: [], pozaTablica: [], zmienne: [], style: [], kontrast: [], nieuzywane: [] };
const naTablicy = new Set();
for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
  const board = sek.children.find(c => c.name === 'Board');
  if (board) for (const n of board.findAll(x => x.type === 'COMPONENT' || x.type === 'COMPONENT_SET')) naTablicy.add(n.id);
}
const zestawy = ds.findAll(n => n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && (!n.parent || n.parent.type !== 'COMPONENT_SET')));
for (const s of zestawy) {
  if (!s.description || !s.description.trim()) b.opisy.push(s.name);
  if (!naTablicy.has(s.id)) b.pozaTablica.push(s.name);
  if (s.type === 'COMPONENT_SET') {
    if (s.children.some(c => /Property \d/.test(c.name))) b.refy.push(s.name + ': wariant nazwany "Property N"');
    const osie = s.children.map(c => c.name.split(',').map(x => x.split('=')[0].trim()).sort().join('|'));
    if (new Set(osie).size > 1) b.refy.push(s.name + ': niespójne osie wariantów');
    // właściwość tekstowa musi mieć warstwę przynajmniej w jednym wariancie
    const defs = s.componentPropertyDefinitions;
    for (const k of Object.keys(defs)) {
      if (defs[k].type !== 'TEXT') continue;
      const gdzies = s.children.some(c => c.findAll(n => n.componentPropertyReferences && n.componentPropertyReferences.characters === k).length);
      if (!gdzies) b.refy.push(s.name + ': właściwość ' + k.split('#')[0] + ' nie jest podpięta do żadnej warstwy');
    }
  }
  for (const n of s.findAll(() => true)) {
    if (n.type === 'TEXT' && (!n.textStyleId || n.textStyleId === figma.mixed)) b.teksty.push(s.name + ' / ' + n.name);
    if ('fills' in n && n.fills && n.fills !== figma.mixed && n.fills.some(f => f.visible !== false && f.type === 'SOLID')) {
      if (!(n.boundVariables && n.boundVariables.fills && n.boundVariables.fills.length)) b.kolory.push(s.name + ' / ' + n.name);
    }
  }
}
for (const v of wszystkie) {
  const c = kolById[v.variableCollectionId];
  const prym = c && c.name === 'Primitives';
  if (!prym) {
    if (!v.scopes || !v.scopes.length || v.scopes.indexOf('ALL_SCOPES') >= 0) b.zmienne.push(v.name + ': zakres');
    if (!(v.codeSyntax || {}).WEB) b.zmienne.push(v.name + ': składnia WEB');
    if (v.resolvedType === 'COLOR') {
      const w = v.valuesByMode[c.modes[0].modeId];
      if (w && w.type !== 'VARIABLE_ALIAS') b.zmienne.push(v.name + ': wartość wprost');
    }
  }
}
for (const s of style) if (!s.description || !s.description.trim()) b.style.push('tekst: ' + s.name);
for (const s of efekty) if (!s.description || !s.description.trim()) b.style.push('efekt: ' + s.name);
// kontrast par tekst/tło
const rozwin = v => { let w = v.valuesByMode[kolById[v.variableCollectionId].modes[0].modeId]; let i = 0; while (w && w.type === 'VARIABLE_ALIAS' && i++ < 8) { const n = byId[w.id]; if (!n) return null; w = n.valuesByMode[kolById[n.variableCollectionId].modes[0].modeId]; } return w; };
const lum = c => { const f = x => { x = x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return x; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const light = kol.find(c => c.name === 'Color');
const V = {}; for (const v of wszystkie) if (v.variableCollectionId === light.id) V[v.name] = v;
// Dwa progi, bo WCAG ma dwa: 1.4.3 zada 4.5:1 od tekstu, 1.4.11 zada 3:1 od granic kontrolek
// i grafiki, ktora cos znaczy (pierscien dnia, obrys pola). Jeden prog na obie klasy zglaszal
// color/outline jako blad przy 3.68:1, choc dla linii 1 px to wartosc zgodna z norma.
const PARY_TEKST = [['color/on-surface','color/surface'],['color/on-surface-variant','color/surface'],['color/on-surface','color/background'],['color/on-surface-variant','color/background'],
  ['color/on-primary','color/primary'],['color/on-primary-container','color/primary-container'],['color/on-success-container','color/success-container'],
  ['color/warning','color/warning-container'],['color/on-error-container','color/error-container'],['color/error','color/surface'],
  ['color/warning-strong','color/surface']];
// tor pierscienia Day ring w tonach Warning i Error - 5 px grafiki niosacej stan dnia
// Pas i obrys bloku zastepstwa (makieta 15c): to grafika niosaca stan, prog 3:1.
// Tekstem ten pomarancz NIE jest - meta idzie na on-primary-container, bo
// color/warning-strong na color/primary-container to w jasnym motywie 3,54:1.
const PARY_GRAFIKA = [['color/warning-strong','color/primary-container'],['color/outline','color/surface'],['color/outline','color/background'],
  ['color/warning','color/surface'],['color/error','color/surface'],['color/success','color/surface']];
// color/outline-variant (1,28:1 w jasnym, 1,45:1 w ciemnym) jest tu NIEOBECNY swiadomie, nie przez
// przeoczenie. Ten token ma dwie prace i tylko jedna podlega progowi: separator listy jest dekoracja,
// ktorej WCAG progu nie stawia, a pelny szary pierscien znaczy "brak wpisow" i odroznia go od weekendu
// takze kolor cyfry, wiec kolor nie jest tam jedynym nosnikiem - brak informacji ma sie cofac.
// Tor, ktory NIESIE stan (wycinek zwolnienia w Day ring / Tone=Neutral), chodzi po color/outline,
// a ten prog 3:1 ma w liscie powyzej. Walidator swiecacy stala czerwienia przestaje byc czytany.
for (const [pary, prog, klasa] of [[PARY_TEKST, 4.5, 'tekst'], [PARY_GRAFIKA, 3, 'grafika']]) {
  for (const [fg, bg] of pary) {
    if (!V[fg] || !V[bg]) { b.kontrast.push(fg + ' / ' + bg + ': brak zmiennej'); continue; }
    const a = rozwin(V[fg]), c2 = rozwin(V[bg]);
    if (!a || !c2) { b.kontrast.push(fg + ' / ' + bg + ': nie rozwinięto'); continue; }
    const l1 = lum(a), l2 = lum(c2);
    const k = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    if (k < prog) b.kontrast.push(klasa + ': ' + fg + ' na ' + bg + ': ' + k.toFixed(2) + ':1 (próg ' + prog + ')');
  }
}
const ile = {}; for (const [k, v] of Object.entries(b)) ile[k] = v.length;
return { liczby: { zestawy: zestawy.length, zmienne: wszystkie.length, styleTekstu: style.length, styleEfektow: efekty.length }, ile, b };
