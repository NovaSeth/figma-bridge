//# Migracja M2h: bloki kalendarza i pozostałe pola (bezpieczne po ID)
const dsPage = figma.root.children.find(p => p.name === 'Design System'); await dsPage.loadAsync();
const C = {}; for (const c of dsPage.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) if (c.parent.type !== 'COMPONENT_SET') C[c.name] = c;
const inst = (n, v) => { const c = C[n]; return (c.type === 'COMPONENT_SET' ? (c.children.find(x => x.name === v) || c.defaultVariant) : c).createInstance(); };
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); return true; } catch (e) {} } return false; };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const vars = await figma.variables.getLocalVariablesAsync(); const vName = id => { const v = vars.find(x => x.id === id); return v ? v.name.replace('color/', '') : null; };
const token = n => { const f = Array.isArray(n.fills) && n.fills.find(p => p.type === 'SOLID' && p.visible !== false); return f && f.boundVariables && f.boundVariables.color ? vName(f.boundVariables.color.id) : null; };
const strokeTok = n => { const f = Array.isArray(n.strokes) && n.strokes[0]; return f && f.boundVariables && f.boundVariables.color ? vName(f.boundVariables.color.id) : null; };
const styles = await figma.getLocalTextStylesAsync(); const sName = id => { const s = styles.find(x => x.id === id); return s ? s.name : null; };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const replace = (old, ni, keep) => { const parent = old.parent, idx = parent.children.indexOf(old); const w = old.width, h = old.height, ax = old.x, ay = old.y; parent.insertChild(idx, ni);
  if (old.layoutPositioning === 'ABSOLUTE') { ni.layoutPositioning = 'ABSOLUTE'; ni.x = ax; ni.y = ay; try { ni.constraints = old.constraints; } catch (e) {} }
  else if (parent.layoutMode && parent.layoutMode !== 'NONE') { try { if (old.layoutSizingHorizontal === 'FILL') ni.layoutSizingHorizontal = 'FILL'; } catch (e) {} }
  else { ni.x = ax; ni.y = ay; }
  if (keep) { try { ni.resize(w, h); } catch (e) {} }
  old.remove(); return ni; };
const KIND = { 'primary-container': 'Lesson', 'success-container': 'Own' };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; }; const errors = [];
const byId = async id => { try { return await figma.getNodeByIdAsync(id); } catch (e) { return null; } };
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) {
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  if (/^1[56]/.test(f.name)) { const ids = main.findAll(x => x.type === 'FRAME' && x.name === 'List Item' && KIND[token(x)] && x.parent.layoutMode === 'NONE' && T(x).length >= 1 && x.height >= 28).map(n => n.id);
    for (const id of ids) { const n = await byId(id); if (!n || n.removed) continue; try { const ts = T(n); const i = inst('Calendar event', 'Kind=' + KIND[token(n)]); setP(i, 'Title', ts[0].characters); setP(i, 'Show meta', ts.length > 1); if (ts[1]) setP(i, 'Meta', ts[1].characters); replace(n, i, true); bump('cal'); } catch (e) { errors.push(f.name.slice(0, 12) + '/cal: ' + e.message); } } }
  const fids = main.findAll(x => x.type === 'FRAME' && ['outline', 'focus', 'error'].includes(strokeTok(x)) && x.height >= 40 && x.width > 200 && T(x).length <= 1 && !x.findAll(y => y.type === 'INSTANCE').length).map(n => n.id);
  for (const id of fids) { const n = await byId(id); if (!n || n.removed) continue; try {
    const wrap = n.parent; const sib = wrap && wrap.children ? wrap.children.filter(c => c !== n) : [];
    const label = sib.flatMap(c => T(c)).find(t => ['label/md', 'label/lg'].includes(sName(t.textStyleId)));
    const errT = sib.flatMap(c => T(c)).find(t => sName(t.textStyleId) === 'label/sm');
    const valueT = T(n)[0]; const st = strokeTok(n); const multiline = n.height > 70; const oldH = n.height;
    const state = st === 'error' || errT ? 'Error' : st === 'focus' ? 'Focus' : valueT && valueT.characters && !/^np\.|^Wybierz|^Napisz/.test(valueT.characters) ? 'Filled' : 'Empty';
    const i = inst('Text field', 'Type=' + (multiline ? 'Multiline' : 'Single') + ', State=' + state);
    setP(i, 'Show label', false); if (valueT) setP(i, 'Value', valueT.characters); if (errT) setP(i, 'Error text', errT.characters);
    const box = replace(n, i, false); try { box.layoutSizingHorizontal = 'FILL'; } catch (e) {}
    const inp = box.findOne(x => x.name === 'Input'); if (inp && multiline) { inp.layoutSizingVertical = 'FIXED'; inp.resize(inp.width, oldH); }
    bump('field-' + state); } catch (e) { errors.push(f.name.slice(0, 12) + '/field: ' + e.message); } }
  progress((fi + 1) / s.children.length, s.name[0] + ' ' + f.name.slice(0, 18)); }
return { stat, errors: errors.slice(0, 8) };
