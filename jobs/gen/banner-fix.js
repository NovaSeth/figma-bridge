//# Naprawa banerów: instancje wskazujące usunięty komponent
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Banner');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const vars = await figma.variables.getLocalVariablesAsync(); const vn = id => { const v = vars.find(x => x.id === id); return v ? v.name.replace('color/', '') : null; };
const tok = n => { const f = Array.isArray(n.fills) && n.fills[0]; return f && f.boundVariables && f.boundVariables.color ? vn(f.boundVariables.color.id) : null; };
const cand = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const n of f.findAll(x => (x.type === 'INSTANCE' || x.type === 'FRAME') && ['success-container', 'warning-container'].includes(tok(x)) && T(x).length >= 1 && x.width > 300)) {
    cand.push({ frame: f.name.slice(0, 14), type: n.type, name: n.name, main: n.type === 'INSTANCE' ? (n.mainComponent ? n.mainComponent.name + '/' + (n.mainComponent.removed ? 'removed' : 'ok') : 'brak') : '-', text: T(n)[0].characters.slice(0, 40), dark: s.name[0] });
  } }
let fixed = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) {
  for (const f of s.children.filter(n => n.type === 'FRAME')) for (const n of f.findAll(x => x.type === 'INSTANCE' && x.mainComponent && x.mainComponent.removed && ['success-container', 'warning-container'].includes(tok(x)))) {
    const text = T(n)[0].characters; const warn = /Nie udało się|nieudane|Spróbuj/.test(text);
    const v = set.children.find(c => c.name === 'Tone=' + (warn ? 'Warning' : 'Success'));
    const i = v.createInstance(); const k = Object.keys(i.componentProperties).find(x => x.startsWith('Text')); if (k) i.setProperties({ [k]: text });
    const parent = n.parent, idx = parent.children.indexOf(n); parent.insertChild(idx, i); try { i.layoutSizingHorizontal = 'FILL'; } catch (e) {}
    n.remove(); fixed++; } }
return { cand: cand.slice(0, 8), fixed, setId: set && set.id };
