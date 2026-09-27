//# opis: naprawa wariantu Success w Banner
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[n]);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Banner');
const log = [];
// sprawdzam, co zmienne naprawdę zwracają
const tryb = cLight.modes[0].modeId;
const wartosc = n => { const v = V[n]; if (!v) return 'brak zmiennej'; const w = v.valuesByMode[tryb]; return JSON.stringify(w); };
log.push({ 'color/success-container': wartosc('color/success-container'), 'color/on-success-container': wartosc('color/on-success-container'), 'color/warning-container': wartosc('color/warning-container') });
const MAP = {
  'Tone=Success': ['color/success-container', 'color/on-success-container', { r: 0.81, g: 0.92, b: 0.84 }, { r: 0.05, g: 0.4, b: 0.18 }],
  'Tone=Warning': ['color/warning-container', 'color/warning-strong', { r: 1, g: 0.91, b: 0.81 }, { r: 0.54, g: 0.26, b: 0 }],
  'Tone=Info': ['color/primary-container', 'color/on-primary-container', { r: 0.83, g: 0.89, b: 0.99 }, { r: 0.02, g: 0.12, b: 0.29 }]
};
for (const v of set.children) {
  const m = MAP[v.name];
  if (!m) continue;
  const [tlo, tekst, rgbTlo, rgbTekst] = m;
  if (V[tlo]) v.fills = [paint(tlo, rgbTlo)];
  for (const t of v.children.filter(c => c.type === 'TEXT')) {
    if (V[tekst]) t.fills = [paint(tekst, rgbTekst)];
  }
  const f = v.fills[0];
  log.push({ wariant: v.name, tlo: [Math.round(f.color.r*255), Math.round(f.color.g*255), Math.round(f.color.b*255)] });
}
await shot(set, { scale: 1, name: 'vDS-Banner' });
return log;
