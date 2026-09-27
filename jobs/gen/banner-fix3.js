//# Naprawa banerów: podmiana na instancje wariantu (niezależnie od typu węzła)
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Banner');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const darkId = cols.find(c => c.name === 'Color Dark').id, lightId = cols.find(c => c.name === 'Color').id;
const byId = Object.fromEntries(vars.map(v => [v.id, v])); const darkByName = Object.fromEntries(vars.filter(v => v.variableCollectionId === darkId).map(v => [v.name, v]));
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const vn = id => { const v = byId[id]; return v ? v.name.replace('color/', '') : null; };
const tok = n => { const f = Array.isArray(n.fills) && n.fills[0]; return f && f.boundVariables && f.boundVariables.color ? vn(f.boundVariables.color.id) : null; };
const toDark = n => { for (const node of [n, ...n.findAll(() => true)]) for (const key of ['fills', 'strokes']) { const arr = node[key]; if (!Array.isArray(arr) || !arr.length) continue;
  let ch = false; const next = arr.map(p => { const b = p.boundVariables && p.boundVariables.color; if (!b) return p; const v = byId[b.id]; if (!v || v.variableCollectionId !== lightId) return p; const d = darkByName[v.name]; if (!d) return p; ch = true; return figma.variables.setBoundVariableForPaint(p, 'color', d); });
  if (ch) try { node[key] = next; } catch (e) {} } };
const report = []; let fixed = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) { const dark = s.name === 'Ciemny motyw';
  for (const f of s.children.filter(n => n.type === 'FRAME')) {
    const ids = f.findAll(x => ['success-container', 'warning-container'].includes(tok(x)) && T(x).length >= 1 && x.width > 300 && x.type !== 'TEXT').map(x => x.id);
    for (const id of ids) { const n = await figma.getNodeByIdAsync(id); if (!n || n.removed) continue;
      const mc = n.type === 'INSTANCE' ? await n.getMainComponentAsync() : null;
      if (mc && mc.parent && mc.parent.id === set.id) continue;
      report.push(f.name.slice(0, 12) + ' ' + n.type + ' ' + n.name.slice(0, 14) + ' main=' + (mc ? mc.name : '-'));
      const text = T(n)[0].characters; const warn = /Nie udało się|nieudane|Spróbuj/.test(text);
      const v = set.children.find(c => c.name === 'Tone=' + (warn ? 'Warning' : 'Success'));
      const i = v.createInstance(); const k = Object.keys(i.componentProperties).find(x => x.startsWith('Text')); if (k) i.setProperties({ [k]: text });
      const parent = n.parent, idx = parent.children.indexOf(n); parent.insertChild(idx, i); try { i.layoutSizingHorizontal = 'FILL'; } catch (e) {}
      if (dark) toDark(i); n.remove(); fixed++; } } }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('20 '), { name: 'b-20', scale: 0.4 });
return { fixed, report: report.slice(0, 10) };
