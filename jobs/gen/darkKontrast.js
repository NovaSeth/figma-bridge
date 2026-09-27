//# opis: kontrast par w ciemnym motywie
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });
const cDark = kol.find(c => c.name === 'Color Dark');
const V = {}; for (const v of wszystkie) if (v.variableCollectionId === cDark.id) V[v.name] = v;
const rozwin = v => { let w = v.valuesByMode[kolById[v.variableCollectionId].modes[0].modeId]; let i = 0;
  while (w && w.type === 'VARIABLE_ALIAS' && i++ < 8) { const n = byId[w.id]; if (!n) return null; w = n.valuesByMode[kolById[n.variableCollectionId].modes[0].modeId]; } return w; };
const lum = c => { const f = x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
const PARY = [['color/on-surface','color/surface'],['color/on-surface-variant','color/surface'],['color/on-surface','color/background'],['color/on-surface-variant','color/background'],
  ['color/on-primary','color/primary'],['color/on-primary-container','color/primary-container'],['color/on-success-container','color/success-container'],
  ['color/warning','color/warning-container'],['color/on-error-container','color/error-container'],['color/error','color/surface'],
  ['color/on-inverse-surface','color/inverse-surface'],['color/on-badge','color/badge'],['color/on-disabled','color/disabled-container'],
  ['color/summary-secondary','color/primary-container'],['color/on-success','color/success'],
  // Napis aktywnej zakladki lezy na tle paska, nie na pigulce.
  ['color/primary','color/surface'],
  ['color/warning-strong','color/surface']];
// grafika niosaca stan (tor pierscienia Day ring, obrysy) - WCAG 1.4.11, prog 3:1
// Pas i obrys bloku zastepstwa (makieta 15c): to grafika niosaca stan, prog 3:1.
// Tekstem ten pomarancz NIE jest - meta idzie na on-primary-container, bo
// color/warning-strong na color/primary-container to w jasnym motywie 3,54:1.
const PARY_GRAFIKA = [['color/warning-strong','color/primary-container'],['color/outline','color/surface'],['color/outline','color/background'],
  ['color/warning','color/surface'],['color/error','color/surface'],['color/success','color/surface'],
  // Ikona aktywnej zakladki lezy NA pigulce - inne tlo niz napis pod nia.
  ['color/primary','color/primary-container']];
// color/outline-variant (1,28:1 w jasnym, 1,45:1 w ciemnym) jest tu NIEOBECNY swiadomie, nie przez
// przeoczenie. Ten token ma dwie prace i tylko jedna podlega progowi: separator listy jest dekoracja,
// ktorej WCAG progu nie stawia, a pelny szary pierscien znaczy "brak wpisow" i odroznia go od weekendu
// takze kolor cyfry, wiec kolor nie jest tam jedynym nosnikiem - brak informacji ma sie cofac.
// Tor, ktory NIESIE stan (wycinek zwolnienia w Day ring / Tone=Neutral), chodzi po color/outline,
// a ten prog 3:1 ma w liscie powyzej. Walidator swiecacy stala czerwienia przestaje byc czytany.
const out = [];
for (const [pary, prog, klasa] of [[PARY, 4.5, 'tekst'], [PARY_GRAFIKA, 3, 'grafika']]) {
for (const [fg, bg] of pary) {
  if (!V[fg] || !V[bg]) { out.push({ para: fg + ' / ' + bg, stan: 'brak zmiennej' }); continue; }
  const a = rozwin(V[fg]), b = rozwin(V[bg]);
  if (!a || !b) { out.push({ para: fg + ' / ' + bg, stan: 'nie rozwinięto' }); continue; }
  const l1 = lum(a), l2 = lum(b);
  const k = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  out.push({ klasa, para: fg + ' na ' + bg, kontrast: +k.toFixed(2), ok: k >= prog });
}
}
return { zle: out.filter(o => o.ok === false || o.stan), wszystkie: out };
