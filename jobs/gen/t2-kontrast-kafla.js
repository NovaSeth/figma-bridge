//# opis: kontrast wartosci na kaflu Icon tile w obu kolekcjach
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = {}; vars.forEach(v => byId[v.id] = v);
const kolById = {}; kol.forEach(c => kolById[c.id] = c);
const rozwin = v => { let w = v.valuesByMode[kolById[v.variableCollectionId].modes[0].modeId]; let i = 0;
  while (w && w.type === 'VARIABLE_ALIAS' && i++ < 8) { const n = byId[w.id]; if (!n) return null; w = n.valuesByMode[kolById[n.variableCollectionId].modes[0].modeId]; } return w; };
const lum = c => { const f = x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
const PARY = [['color/on-surface','color/neutral-container'],['color/on-primary','color/primary'],['color/on-success','color/success'],['color/on-primary','color/warning-strong']];
const out = [];
for (const nazwaKol of ['Color','Color Dark']) {
  const c = kol.find(k => k.name === nazwaKol);
  const V = {}; for (const v of vars) if (v.variableCollectionId === c.id) V[v.name] = v;
  for (const [fg, bg] of PARY) {
    const a = rozwin(V[fg]), b = rozwin(V[bg]);
    const l1 = lum(a), l2 = lum(b);
    const k = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    out.push({ kolekcja: nazwaKol, para: fg + ' na ' + bg, kontrast: +k.toFixed(2), ok: k >= 4.5 });
  }
}
return out;
