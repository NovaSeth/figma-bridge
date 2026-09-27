//# Migracja M2d: nagłówki sekcji, karta podsumowania, karty akcji + poprawki
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const C = {}; for (const c of ds.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) if (c.parent.type !== 'COMPONENT_SET') C[c.name] = c;
const inst = (n, v) => { const c = C[n]; return (c.type === 'COMPONENT_SET' ? (c.children.find(x => x.name === v) || c.defaultVariant) : c).createInstance(); };
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); return true; } catch (e) {} } return false; };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const vars = await figma.variables.getLocalVariablesAsync(); const vName = id => { const v = vars.find(x => x.id === id); return v ? v.name.replace('color/', '') : null; };
const token = n => { const f = Array.isArray(n.fills) && n.fills.find(p => p.type === 'SOLID' && p.visible !== false); return f && f.boundVariables && f.boundVariables.color ? vName(f.boundVariables.color.id) : null; };
const T = n => n.findAllWithCriteria({ types: ['TEXT'] });
const replace = (old, ni) => { const parent = old.parent, idx = parent.children.indexOf(old); parent.insertChild(idx, ni);
  if (old.layoutPositioning === 'ABSOLUTE') { ni.layoutPositioning = 'ABSOLUTE'; ni.x = old.x; ni.y = old.y; try { ni.constraints = old.constraints; } catch (e) {} }
  else if (parent.layoutMode && parent.layoutMode !== 'NONE') { try { ni.layoutGrow = old.layoutGrow; } catch (e) {} try { if (old.layoutSizingHorizontal === 'FILL') ni.layoutSizingHorizontal = 'FILL'; } catch (e) {} }
  else { ni.x = old.x; ni.y = old.y; }
  old.remove(); return ni; };
const chipData = n => n.findAll(x => x.type === 'INSTANCE' && x.name === 'Chip').map(c => { const k = Object.keys(c.componentProperties); const lab = k.find(x => x.startsWith('Label')); const ic = k.find(x => x.startsWith('Show icon')); return { tone: c.componentProperties['Tone'] ? c.componentProperties['Tone'].value : 'Neutral', label: lab ? c.componentProperties[lab].value : '', icon: ic ? c.componentProperties[ic].value : false, iconId: (c.componentProperties[k.find(x => x.startsWith('Icon'))] || {}).value }; });
const applyChips = (i, data) => { const chips = i.findAll(x => x.type === 'INSTANCE' && /^Chip( \d)?$/.test(x.name)); data.slice(0, chips.length).forEach((d, idx) => { const c = chips[idx]; try { c.setProperties({ Tone: d.tone }); } catch (e) {} setP(c, 'Label', d.label); setP(c, 'Show icon', !!d.icon); if (d.icon && d.iconId) setP(c, 'Icon', d.iconId); });
  for (let k = data.length + 1; k <= chips.length; k++) setP(i, 'Show chip ' + k, false); for (let k = 2; k <= Math.min(data.length, chips.length); k++) setP(i, 'Show chip ' + k, true); };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; }; const errors = []; const info = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) { const go = (label, fn) => { try { fn(); } catch (e) { errors.push(f.name.slice(0, 14) + '/' + label + ': ' + (e.message || e)); } };
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  // nagłówki sekcji + podtytuł
  go('heading', () => { for (const h of main.findAll(x => x.type === 'FRAME' && x.name === 'Heading 2' && T(x).length === 1 && T(x)[0].fontSize >= 19)) {
    const parent = h.parent, idx = parent.children.indexOf(h); const next = parent.children[idx + 1];
    const sub = next && next.name === 'Section sub' ? T(next)[0] : null;
    const i = inst('Section heading'); setP(i, 'Title', T(h)[0].characters); if (sub) { setP(i, 'Show subtitle', true); setP(i, 'Subtitle', sub.characters); }
    replace(h, i); i.layoutSizingHorizontal = 'FILL'; if (sub) sub.parent.remove(); bump('heading'); } });
  // karta podsumowania
  go('summary', () => { for (const n of main.findAll(x => x.type === 'FRAME' && token(x) === 'primary-container' && x.width > 300 && T(x).length >= 2 && x.findAll(y => y.name === 'Progress' || /zamknięte/.test((y.characters || ''))).length)) {
    const ts = T(n).map(t => t.characters); const lead = ts[0]; const count = ts.find(t => /zamknięte/.test(t)) || ''; const detail = ts.find(t => t !== lead && t !== count) || '';
    const m = count.match(/(\d+)\s*z\s*(\d+)/); const pct = m && +m[2] ? Math.round(+m[1] / +m[2] * 4) * 25 : 0;
    const i = inst('Summary card'); setP(i, 'Lead', lead); setP(i, 'Show detail', !!detail); if (detail) setP(i, 'Detail', detail); setP(i, 'Show progress', !!count); if (count) setP(i, 'Progress label', count);
    const pb = i.findOne(x => x.type === 'INSTANCE' && x.name === 'Progress bar'); if (pb) { try { pb.setProperties({ Value: String(pct) }); } catch (e) { errors.push('progress ' + pct + ': ' + e.message); } }
    replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('summary'); } });
  // karty akcji
  go('card', () => { for (const n of main.findAll(x => x.type === 'FRAME' && x.name === 'ActionCard')) {
    const btns = n.findAll(x => x.type === 'INSTANCE' && x.name === 'Button'); const labels = btns.map(b => { const k = Object.keys(b.componentProperties).find(y => y.startsWith('Label')); return k ? b.componentProperties[k].value : ''; });
    const kind = labels.includes('Odpowiedz') ? 'Message' : 'Task';
    const ts = T(n).filter(t => !btns.some(b => b.findAll(y => y === t).length)); const title = ts.find(t => t.fontSize >= 16); const meta = ts.find(t => t !== title && t.fontSize === 15);
    const chips = chipData(n);
    const i = inst('Action card', 'Kind=' + kind); setP(i, 'Title', title ? title.characters : ''); setP(i, 'Meta', meta ? meta.characters : ''); applyChips(i, chips);
    const prim = i.findOne(x => x.type === 'INSTANCE' && x.name === 'Primary'); if (prim) setP(prim, 'Label', labels.find(l => /Zrobione/.test(l)) || 'Zrobione');
    replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('card-' + kind); } });
  // zwinięte grupy: wysokość = wysokość nagłówka
  go('collapse', () => { for (const n of main.findAll(x => x.type === 'FRAME' && x.clipsContent && ['Details', 'Completed', 'Plan'].includes(x.name) && x.children.length > 1)) {
    const head = n.children.find(c => c.type === 'INSTANCE' && c.name === 'Disclosure'); if (!head) continue;
    const expanded = head.componentProperties['Expanded'] && head.componentProperties['Expanded'].value === 'True';
    if (!expanded) { n.layoutSizingVertical = 'FIXED'; n.resize(n.width, head.height); bump('collapse'); } } });
  // przycisk pływający
  go('fab', () => { for (const n of f.findAll(x => x.type === 'FRAME' && x.type !== 'INSTANCE' && T(x).length === 1 && ['Napisz', 'Dodaj zajęcia', 'Dokończ szkic'].includes(T(x)[0].characters) && x.width > 90 && x.height > 40)) {
    const label = T(n)[0].characters; const ic = n.findAll(x => x.name.startsWith('Icon/'))[0]; const i = inst('FAB'); setP(i, 'Label', label); if (ic && C[ic.name]) setP(i, 'Icon', C[ic.name].id);
    const abs = n.absoluteBoundingBox, fb = f.absoluteBoundingBox; const right = abs.x - fb.x + abs.width, bottom = abs.y - fb.y + abs.height;
    const parent = n.parent; n.remove(); f.appendChild(i); i.layoutPositioning = 'ABSOLUTE'; i.x = right - i.width; i.y = bottom - i.height; bump('fab'); info.push(f.name.slice(0, 12) + ' fab w ' + parent.name); } });
  progress((fi + 1) / s.children.length, s.name[0] + ' ' + f.name.slice(0, 18)); }
return { stat, errors: errors.slice(0, 12), info: info.slice(0, 6) };
