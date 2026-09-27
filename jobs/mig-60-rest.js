//# Migracja M2f: FAB, karty wiadomości, cytat, pola, KPI, arkusze
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const C = {}; for (const c of ds.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) if (c.parent.type !== 'COMPONENT_SET') C[c.name] = c;
const inst = (n, v) => { const c = C[n]; return (c.type === 'COMPONENT_SET' ? (c.children.find(x => x.name === v) || c.defaultVariant) : c).createInstance(); };
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); return true; } catch (e) {} } return false; };
const getP = (i, name) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); return k ? i.componentProperties[k].value : undefined; };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const vars = await figma.variables.getLocalVariablesAsync(); const vName = id => { const v = vars.find(x => x.id === id); return v ? v.name.replace('color/', '') : null; };
const token = n => { const f = Array.isArray(n.fills) && n.fills.find(p => p.type === 'SOLID' && p.visible !== false); return f && f.boundVariables && f.boundVariables.color ? vName(f.boundVariables.color.id) : null; };
const styles = await figma.getLocalTextStylesAsync(); const sName = id => { const s = styles.find(x => x.id === id); return s ? s.name : null; };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const replace = (old, ni, keepSize) => { const parent = old.parent, idx = parent.children.indexOf(old); const w = old.width, h = old.height; parent.insertChild(idx, ni);
  if (old.layoutPositioning === 'ABSOLUTE') { ni.layoutPositioning = 'ABSOLUTE'; ni.x = old.x; ni.y = old.y; try { ni.constraints = old.constraints; } catch (e) {} }
  else if (parent.layoutMode && parent.layoutMode !== 'NONE') { try { if (old.layoutSizingHorizontal === 'FILL') ni.layoutSizingHorizontal = 'FILL'; } catch (e) {} }
  else { ni.x = old.x; ni.y = old.y; }
  if (keepSize) { try { ni.resize(w, h); } catch (e) {} }
  old.remove(); return ni; };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; }; const errors = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) { const go = (l, fn) => { try { fn(); } catch (e) { errors.push(f.name.slice(0, 14) + '/' + l + ': ' + (e.message || e)); } };
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  go('fab', () => { for (const n of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Button' && ['Napisz', 'Dodaj zajęcia', 'Dokończ szkic'].includes(getP(x, 'Label')))) {
    const i = inst('FAB'); setP(i, 'Label', getP(n, 'Label')); const ic = getP(n, 'Icon'); if (ic) setP(i, 'Icon', ic);
    const abs = n.absoluteBoundingBox, fb = f.absoluteBoundingBox; const right = abs.x - fb.x + abs.width, bottom = abs.y - fb.y + abs.height;
    n.remove(); f.appendChild(i); i.layoutPositioning = 'ABSOLUTE'; i.x = right - i.width; i.y = bottom - i.height; bump('fab'); } });
  go('msgcard', () => { for (const n of main.findAll(x => x.type === 'FRAME' && ['surface', 'primary-container'].includes(token(x)) && x.width > 300 && x.findAll(y => y.type === 'INSTANCE' && y.name === 'Avatar').length === 1 && T(x).length >= 3 && x.cornerRadius >= 14 && !x.findAll(y => y.type === 'INSTANCE' && /row|card/i.test(y.name)).length)) {
    const av = n.findAll(y => y.type === 'INSTANCE' && y.name === 'Avatar')[0]; const ts = T(n).filter(t => !av.findAll(z => z === t).length);
    const name = ts.find(t => ['title/sm', 'title/md'].includes(sName(t.textStyleId))) || ts[0]; const meta = ts.find(t => sName(t.textStyleId) === 'body/xs'); const body = ts.filter(t => t !== name && t !== meta).sort((a, b) => b.characters.length - a.characters.length)[0];
    if (!body) return; const own = token(n) === 'primary-container';
    const i = inst('Message card', 'Own=' + (own ? 'True' : 'False')); setP(i, 'Name', name.characters); if (meta) setP(i, 'Meta', meta.characters); setP(i, 'Body', body.characters);
    const a2 = i.findOne(x => x.type === 'INSTANCE' && x.name === 'Avatar'); const init = getP(av, 'Initials'); if (a2 && init) setP(a2, 'Initials', init);
    replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('msgcard'); } });
  go('quote', () => { for (const n of main.findAll(x => x.type === 'FRAME' && x.name === 'Quote' && T(x).length === 2)) { const ts = T(n); const i = inst('Quote'); setP(i, 'By', ts[0].characters); setP(i, 'Text', ts[1].characters); replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('quote'); } });
  go('static', () => { for (const n of main.findAll(x => x.type === 'FRAME' && /^Field (Do|Temat)$/.test(x.name))) { const ts = T(n); const chip = n.findAll(y => y.type === 'INSTANCE' && /^Chip/.test(y.name))[0];
    const i = inst('Static field'); setP(i, 'Label', ts[0].characters); setP(i, 'Value', ts[1].characters); setP(i, 'Show chip', !!chip);
    if (chip) { const c2 = i.findOne(x => x.type === 'INSTANCE' && /^Chip/.test(x.name)); if (c2) { setP(c2, 'Label', getP(chip, 'Label')); setP(c2, 'Show icon', false); } }
    replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('static'); } });
  go('field', () => { for (const n of main.findAll(x => x.type === 'FRAME' && ['Field', 'Label'].includes(x.name) === false && x.type === 'FRAME' && x.children.length >= 1 && x.findAll(y => y.type === 'FRAME' && y.name === 'Input').length === 1 && T(x).length <= 3)) {
    const input = n.findAll(y => y.name === 'Input')[0]; const ts = T(n); const label = ts.find(t => ['label/md', 'label/lg'].includes(sName(t.textStyleId))); const valueT = T(input)[0]; const err = ts.find(t => sName(t.textStyleId) === 'label/sm' && t !== label);
    const multiline = input.height > 70; const state = err ? 'Error' : (input.strokes[0] && input.strokes[0].boundVariables && vName(input.strokes[0].boundVariables.color.id) === 'focus') ? 'Focus' : valueT && valueT.characters && !/^np\./.test(valueT.characters) ? 'Filled' : 'Empty';
    const i = inst('Text field', 'Type=' + (multiline ? 'Multiline' : 'Single') + ', State=' + state);
    setP(i, 'Show label', !!label); if (label) setP(i, 'Label', label.characters); if (valueT) setP(i, 'Value', valueT.characters); if (err) setP(i, 'Error text', err.characters);
    replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('field-' + state); } });
  go('kpi', () => { for (const n of main.findAll(x => x.type === 'FRAME' && x.name === 'Summary' && T(x).length === 3 && token(x) === 'surface')) { const ts = T(n); const i = inst('KPI card'); setP(i, 'Value', ts[0].characters); setP(i, 'Title', ts[1].characters); setP(i, 'Detail', ts[2].characters); replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('kpi'); } });
  go('sheet', () => { const sheet = f.children.find(c => c.name === 'Bottom sheet'); if (!sheet) return;
    const grab = sheet.children.find(c => c.name === 'Grabber'), bar = sheet.children.find(c => c.name === 'Bar');
    if (grab) { const kicker = bar ? T(bar)[0] : null; const i = inst('Sheet header'); setP(i, 'Show kicker', !!kicker); if (kicker) setP(i, 'Kicker', kicker.characters);
      const idx = sheet.children.indexOf(grab); sheet.insertChild(idx, i); i.layoutSizingHorizontal = 'FILL'; grab.remove(); if (bar) bar.remove(); bump('sheet-header'); }
    const act = sheet.children.find(c => c.name === 'Actions'); if (act) { const btns = act.findAll(x => x.type === 'INSTANCE' && x.name === 'Button'); const labels = btns.map(x => getP(x, 'Label'));
      const kind = btns.length >= 2 ? 'Primary + Secondary' : (btns[0] && getP(btns[0], 'Label') && ['Zamknij', 'Otwórz w Librusie'].includes(getP(btns[0], 'Label'))) ? 'Secondary' : 'Primary';
      const i = inst('Sheet actions', 'Actions=' + kind); const p = i.findOne(x => x.type === 'INSTANCE' && x.name === 'Primary'), sc = i.findOne(x => x.type === 'INSTANCE' && x.name === 'Secondary');
      if (p && labels[0]) { setP(p, 'Label', labels[0]); const ic = getP(btns[0], 'Icon'); const si = getP(btns[0], 'Show icon'); setP(p, 'Show icon', !!si); if (si && ic) setP(p, 'Icon', ic); }
      if (sc && labels[1]) { setP(sc, 'Label', labels[1]); const si = getP(btns[1], 'Show icon'); setP(sc, 'Show icon', !!si); if (si) setP(sc, 'Icon', getP(btns[1], 'Icon')); }
      if (sc && !labels[1] && labels[0] && kind === 'Secondary') setP(sc, 'Label', labels[0]);
      replace(act, i); i.layoutSizingHorizontal = 'FILL'; bump('sheet-actions'); } });
  progress((fi + 1) / s.children.length, s.name[0] + ' ' + f.name.slice(0, 18)); }
return { stat, errors: errors.slice(0, 12) };
