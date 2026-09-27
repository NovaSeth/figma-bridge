//# Migracja M2g: pola formularzy i bloki w kalendarzu
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const C = {}; for (const c of ds.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) if (c.parent.type !== 'COMPONENT_SET') C[c.name] = c;
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
const KIND = { 'primary-container': 'Lesson', 'success-container': 'Own', 'warning-container': 'Task', 'neutral-container': 'School' };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; }; const errors = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) { const go = (l, fn) => { try { fn(); } catch (e) { errors.push(f.name.slice(0, 14) + '/' + l + ': ' + (e.message || e)); } };
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  go('field', () => { for (const input of main.findAll(x => x.type === 'FRAME' && x.name === 'Input')) {
    const wrap = input.parent; if (!wrap || wrap.type === 'INSTANCE') continue;
    const ts = T(wrap); const label = ts.find(t => ['label/md', 'label/lg'].includes(sName(t.textStyleId)) && !T(input).includes(t));
    const valueT = T(input)[0]; const err = ts.find(t => sName(t.textStyleId) === 'label/sm' && t !== label && !T(input).includes(t));
    const multiline = input.height > 70; const st = strokeTok(input);
    const state = err || st === 'error' ? 'Error' : st === 'focus' ? 'Focus' : valueT && valueT.characters && !/^np\.|^Wybierz|^Napisz/.test(valueT.characters) ? 'Filled' : 'Empty';
    const i = inst('Text field', 'Type=' + (multiline ? 'Multiline' : 'Single') + ', State=' + state);
    setP(i, 'Show label', !!label); if (label) setP(i, 'Label', label.characters); if (valueT) setP(i, 'Value', valueT.characters); if (err) setP(i, 'Error text', err.characters);
    const target = wrap.children.length <= 3 && /Field|Label|Container/.test(wrap.name) ? wrap : input;
    const box = replace(target, i, false); try { box.layoutSizingHorizontal = 'FILL'; } catch (e) {} if (multiline) { const inp = box.findOne(x => x.name === 'Input'); if (inp) { inp.layoutSizingVertical = 'FIXED'; inp.resize(inp.width, input.height); } }
    bump('field-' + state); } });
  go('calendar', () => { if (!/^1[56]/.test(f.name)) return;
    for (const n of main.findAll(x => x.type === 'FRAME' && x.layoutPositioning === 'ABSOLUTE' && KIND[token(x)] && T(x).length >= 1 && x.height >= 28 && x.width >= 50 && x.width < 340 && !x.findAll(y => y.type === 'INSTANCE' && /row|Chip/i.test(y.name)).length)) {
      const ts = T(n); const title = ts[0], meta = ts[1];
      const i = inst('Calendar event', 'Kind=' + KIND[token(n)]); setP(i, 'Title', title.characters); setP(i, 'Show meta', !!meta); if (meta) setP(i, 'Meta', meta.characters);
      replace(n, i, true); bump('cal-' + KIND[token(n)]); } });
  progress((fi + 1) / s.children.length, s.name[0] + ' ' + f.name.slice(0, 18)); }
return { stat, errors: errors.slice(0, 10) };
