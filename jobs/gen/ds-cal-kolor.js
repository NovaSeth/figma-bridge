//# opis: kolory wiazane z rozwinieta wartoscia (samo wiazanie zostawialo czern)
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = {}; vars.forEach(v => { byId[v.id] = v; });
const colById = {}; cols.forEach(c => { colById[c.id] = c; });
const rozwin = v => { let w = v.valuesByMode[colById[v.variableCollectionId].modes[0].modeId]; let i = 0; while (w && w.type === 'VARIABLE_ALIAS' && i++ < 8) { const n = byId[w.id]; w = n.valuesByMode[colById[n.variableCollectionId].modes[0].modeId]; } return w; };
const V = (n, kol) => vars.find(v => v.name === n && v.variableCollectionId === cols.find(c => c.name === (kol || 'Color')).id);
// Samo setBoundVariableForPaint zostawia kolor zastepczy (czern) i tak sie
// renderuje. Podajemy wiec rozwinieta wartosc jako kolor bazowy.
const paint = (n, kol) => { const v = V('color/' + n, kol); const c = rozwin(v); return [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }, 'color', v)]; };
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar event');
const sub = set.children.find(x => x.name === 'Kind=Lesson, State=Substituted');
const can = set.children.find(x => x.name === 'Kind=Lesson, State=Cancelled');
sub.fills = paint('primary-container');
sub.strokes = paint('warning-strong');
sub.findOne(n => n.name === 'Accent').fills = paint('warning-strong');
sub.findOne(n => n.type === 'TEXT' && n.name === 'Title').fills = paint('on-primary-container');
sub.findOne(n => n.type === 'TEXT' && n.name === 'Meta').fills = paint('warning-strong');
can.strokes = paint('outline');
can.findOne(n => n.type === 'TEXT' && n.name === 'Title').fills = paint('on-surface-variant');
can.findOne(n => n.type === 'TEXT' && n.name === 'Meta').fills = paint('on-surface-variant');
return { ok: true };
