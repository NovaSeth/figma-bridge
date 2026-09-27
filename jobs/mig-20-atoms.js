//# Migracja M2b: chipy, przyciski, awatary, liczniki, kółka, przełączniki, kafle
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const C = {}; for (const c of ds.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) if (c.parent.type !== 'COMPONENT_SET') C[c.name] = c;
const ICON = n => C['Icon/' + n];
const inst = (name, variant) => { const c = C[name]; return (c.type === 'COMPONENT_SET' ? (c.children.find(v => v.name === variant) || c.defaultVariant) : c).createInstance(); };
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); } catch (e) {} } };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const vars = await figma.variables.getLocalVariablesAsync(); const vName = id => { const v = vars.find(x => x.id === id); return v ? v.name.replace('color/', '') : null; };
const token = n => { const f = Array.isArray(n.fills) && n.fills.find(p => p.type === 'SOLID' && p.visible !== false); return f && f.boundVariables && f.boundVariables.color ? vName(f.boundVariables.color.id) : null; };
const strokeToken = n => { const f = Array.isArray(n.strokes) && n.strokes[0]; return f && f.boundVariables && f.boundVariables.color ? vName(f.boundVariables.color.id) : null; };
const texts = n => n.findAllWithCriteria({ types: ['TEXT'] });
const iconNames = n => n.findAllWithCriteria({ types: ['INSTANCE'] }).filter(i => i.name.startsWith('Icon/')).map(i => i.name.slice(5));
const replace = (old, ni) => { const parent = old.parent, idx = parent.children.indexOf(old); parent.insertChild(idx, ni);
  if (old.layoutPositioning === 'ABSOLUTE') { ni.layoutPositioning = 'ABSOLUTE'; ni.x = old.x; ni.y = old.y; try { ni.constraints = old.constraints; } catch (e) {} }
  else if (parent.layoutMode && parent.layoutMode !== 'NONE') { try { ni.layoutGrow = old.layoutGrow; } catch (e) {} try { ni.layoutAlign = old.layoutAlign; } catch (e) {} if (old.layoutSizingHorizontal === 'FILL') { try { ni.layoutSizingHorizontal = 'FILL'; } catch (e) {} } }
  else { ni.x = old.x; ni.y = old.y; }
  old.remove(); };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; }; const errors = [];
const TONE = { 'neutral-container': 'Neutral', 'warning-container': 'Warning', 'success-container': 'Success', 'primary-container': 'Info' };
const BTN = { 'inverse-surface': 'Primary', 'neutral-container': 'Secondary' };
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) { try {
  const R = Math.round;
  // chipy
  for (const n of f.findAll(x => x.type === 'FRAME' && x.layoutMode === 'HORIZONTAL' && R(x.height) >= 22 && R(x.height) <= 30 && TONE[token(x)] && texts(x).length === 1 && x.children.length <= 2 && (x.cornerRadius === 8 || (x.boundVariables && x.boundVariables.topLeftRadius)))) {
    const t = texts(n)[0]; const ic = iconNames(n)[0]; const i = inst('Chip', 'Tone=' + TONE[token(n)]);
    setP(i, 'Label', t.characters); setP(i, 'Show icon', !!ic); if (ic) setP(i, 'Icon', ICON(ic).id);
    replace(n, i); bump('chip'); }
  // przyciski
  for (const n of f.findAll(x => x.type === 'FRAME' && x.layoutMode === 'HORIZONTAL' && R(x.height) >= 40 && R(x.height) <= 52 && texts(x).length === 1 && x.children.length <= 3 && ((BTN[token(x)] && (x.cornerRadius === 12 || x.cornerRadius === 999 || x.boundVariables)) || (!token(x) && strokeToken(x) === 'outline' && x.cornerRadius >= 20)))) {
    const t = texts(n)[0]; if (t.fontSize > 17 || t.characters.length > 28) continue; const ic = iconNames(n)[0];
    const style = token(n) ? BTN[token(n)] : 'Outline'; const i = inst('Button', 'Style=' + style + ', State=Default');
    setP(i, 'Label', t.characters); setP(i, 'Show icon', !!ic); if (ic) setP(i, 'Icon', ICON(ic).id);
    replace(n, i); bump('button-' + style); }
  // awatary
  for (const n of f.findAll(x => x.type === 'FRAME' && token(x) === 'primary-container' && texts(x).length === 1 && x.children.length === 1 && Math.abs(x.width - x.height) < 2 && [40, 44, 72].includes(R(x.width)) && texts(x)[0].characters.length <= 2)) {
    const i = inst('Avatar', 'Size=' + R(n.width)); setP(i, 'Initials', texts(n)[0].characters); replace(n, i); bump('avatar'); }
  // liczniki
  for (const n of f.findAll(x => x.type === 'FRAME' && token(x) === 'badge' && texts(x).length === 1)) { const i = inst('Badge'); setP(i, 'Count', texts(n)[0].characters); replace(n, i); bump('badge'); }
  // kółka zadań
  for (const n of f.findAll(x => x.type === 'FRAME' && Math.abs(x.width - 26) < 2 && Math.abs(x.height - 26) < 2 && (strokeToken(x) === 'outline' || token(x) === 'primary'))) { const i = inst('Checkbox', 'Checked=' + (token(n) === 'primary' ? 'True' : 'False')); replace(n, i); bump('checkbox'); }
  // przełączniki
  for (const n of f.findAll(x => x.type === 'FRAME' && Math.abs(x.width - 51) < 2 && Math.abs(x.height - 31) < 2)) { const i = inst('Switch', 'On=' + (token(n) === 'primary' ? 'True' : 'False')); replace(n, i); bump('switch'); }
  // kafle ikon
  for (const n of f.findAll(x => x.type === 'FRAME' && Math.abs(x.width - 32) < 2 && Math.abs(x.height - 32) < 2 && iconNames(x).length === 1 && ['primary', 'success', 'warning-strong', 'neutral-container'].includes(token(x)))) {
    const tone = { primary: 'Primary', success: 'Success', 'warning-strong': 'Warning', 'neutral-container': 'Neutral' }[token(n)]; const i = inst('Icon tile', 'Tone=' + tone); setP(i, 'Icon', ICON(iconNames(n)[0]).id); replace(n, i); bump('tile'); }
} catch (e) { errors.push(f.name.slice(0, 22) + ': ' + (e.message || e)); }
  progress((fi + 1) / s.children.length, s.name[0] + ' ' + f.name.slice(0, 18)); }
return { stat, errors: errors.slice(0, 10) };
