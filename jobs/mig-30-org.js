//# Migracja M2c: nagłówki, paski zakładek, arkusze i inne bloki jako instancje
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const C = {}; for (const c of ds.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) if (c.parent.type !== 'COMPONENT_SET') C[c.name] = c;
const inst = (n, v) => { const c = C[n]; return (c.type === 'COMPONENT_SET' ? (c.children.find(x => x.name === v) || c.defaultVariant) : c).createInstance(); };
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); return true; } catch (e) { return false; } } return false; };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const vars = await figma.variables.getLocalVariablesAsync(); const vName = id => { const v = vars.find(x => x.id === id); return v ? v.name.replace('color/', '') : null; };
const token = n => { const f = Array.isArray(n.fills) && n.fills.find(p => p.type === 'SOLID' && p.visible !== false); return f && f.boundVariables && f.boundVariables.color ? vName(f.boundVariables.color.id) : null; };
const T = n => n.findAllWithCriteria({ types: ['TEXT'] }); const chars = n => T(n).map(t => t.characters);
const replace = (old, ni) => { const parent = old.parent, idx = parent.children.indexOf(old); parent.insertChild(idx, ni);
  if (old.layoutPositioning === 'ABSOLUTE') { ni.layoutPositioning = 'ABSOLUTE'; ni.x = old.x; ni.y = old.y; try { ni.constraints = old.constraints; } catch (e) {} }
  else if (parent.layoutMode && parent.layoutMode !== 'NONE') { try { ni.layoutGrow = old.layoutGrow; } catch (e) {} try { if (old.layoutSizingHorizontal === 'FILL') ni.layoutSizingHorizontal = 'FILL'; } catch (e) {} }
  else { ni.x = old.x; ni.y = old.y; }
  old.remove(); return ni; };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; }; const errors = [];
const TAB_ICON = { Teraz: 'home', Zadania: 'task_alt', Oceny: 'grading', 'Wiadomości': 'mail', Plan: 'calendar_month' };
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) { const go = (label, fn) => { try { fn(); } catch (e) { errors.push(f.name.slice(0, 16) + '/' + label + ': ' + (e.message || e)); } };
  // dolna nawigacja
  go('tabbar', () => { const nav = f.children.find(c => c.name.startsWith('Navigation')); if (!nav) return;
    const active = nav.children.find(b => b.findAll(x => token(x) === 'primary-container').length) || nav.children[0];
    const name = chars(active).find(t => TAB_ICON[t]) || 'Teraz';
    const i = inst('Tab bar', 'Active=' + name); const count = (nav.findAll(x => x.name === 'Badge' || x.name === 'Count')[0] || {});
    const badgeText = chars(nav).find(t => /^\d+$/.test(t)); const teraz = i.findOne(x => x.name === 'Tab Teraz'); if (teraz) { setP(teraz, 'Show badge', !!badgeText); if (badgeText) { const b = teraz.findOne(x => x.name === 'Badge'); if (b) setP(b, 'Count', badgeText); } }
    replace(nav, i); i.layoutSizingHorizontal = 'FILL'; bump('tabbar'); });
  // nagłówek aplikacji
  go('header', () => { const h = f.children.find(c => c.name === 'Header'); if (!h) return; const cs = chars(h);
    const i = inst('App header'); setP(i, 'Name', cs.find(t => /^Julia|Drugie/.test(t)) || 'Julia'); setP(i, 'Class', cs.find(t => /klasa/.test(t)) || 'klasa 1, SP Łady');
    replace(h, i); i.layoutSizingHorizontal = 'FILL'; bump('header'); });
  // pasek ekranu przykrywającego
  go('cover', () => { const main = f.children.find(c => c.name === 'Main Content'); if (!main) return; const bar = main.children.find(c => c.name === 'Top bar'); if (!bar) return;
    const i = inst('Cover top bar'); setP(i, 'Title', T(bar)[0].characters); replace(bar, i); i.layoutSizingHorizontal = 'FILL'; bump('cover'); });
  // przycisk pływający
  go('fab', () => { for (const n of f.children.filter(c => c.layoutPositioning === 'ABSOLUTE' && c.type === 'FRAME' && T(c).length === 1 && ['Napisz', 'Dodaj zajęcia', 'Dokończ szkic'].includes(T(c)[0].characters))) {
    const i = inst('FAB'); setP(i, 'Label', T(n)[0].characters); const ic = n.findAll(x => x.name.startsWith('Icon/'))[0]; if (ic) setP(i, 'Icon', C[ic.name].id);
    const oldRight = n.x + n.width, oldBottom = n.y + n.height; replace(n, i); i.x = oldRight - i.width; i.y = oldBottom - i.height; bump('fab'); } });
  // przyciemnienie tła
  go('scrim', () => { for (const n of f.children.filter(c => c.name === 'Scrim')) { const i = inst('Scrim'); const w = n.width, h = n.height; replace(n, i); i.resize(w, h); bump('scrim'); } });
  // wskaźnik odświeżania
  go('refresh', () => { const n = f.findOne(x => x.name === 'Pull to refresh'); if (!n) return; const i = inst('Refresh indicator'); replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('refresh'); });
  // przełącznik segmentowy
  go('segmented', () => { for (const n of f.findAll(x => x.type === 'FRAME' && x.layoutMode === 'HORIZONTAL' && token(x) === 'neutral-container' && x.children.length >= 2 && x.children.length <= 4 && x.children.every(c => c.type === 'FRAME' && T(c).length >= 1 && T(c).length <= 2) && Math.round(x.height) >= 44)) {
    const labels = n.children.map(c => T(c)[0].characters); const activeIdx = n.children.findIndex(c => token(c) === 'surface') + 1 || 1;
    const i = inst('Segmented control', 'Segments=' + n.children.length + ', Active=' + activeIdx);
    labels.forEach((l, idx) => setP(i, 'Label ' + (idx + 1), l));
    const badge = n.children.flatMap(c => T(c)).find(t => /^\(?\d+\)?$/.test(t.characters));
    setP(i, 'Show badge', !!badge); if (badge) { const b = i.findOne(x => x.name === 'Badge'); if (b) setP(b, 'Count', badge.characters.replace(/[()]/g, '')); }
    replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('segmented'); } });
  // nawigacja po okresie
  go('datenav', () => { for (const n of f.findAll(x => x.name === 'Date nav' && x.type === 'FRAME')) { const title = T(n).find(t => t.fontSize >= 18); const i = inst('Date nav'); if (title) setP(i, 'Period', title.characters); replace(n, i); bump('datenav'); } });
  // pusty stan
  go('empty', () => { for (const n of f.findAll(x => x.type === 'FRAME' && x.name === 'State' && T(x).length >= 2)) { const ts = T(n); const i = inst('Empty state'); setP(i, 'Title', ts[0].characters); setP(i, 'Body', ts[1].characters); const ic = n.findAll(x => x.name.startsWith('Icon/'))[0]; if (ic) setP(i, 'Icon', C[ic.name].id); replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('empty'); } });
  // komunikat stanu
  go('banner', () => { for (const n of f.findAll(x => x.type === 'FRAME' && ['success-container', 'warning-container'].includes(token(x)) && T(x).length === 1 && x.width > 300 && T(x)[0].fontSize >= 14)) { const i = inst('Banner'); setP(i, 'Text', T(n)[0].characters); replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('banner'); } });
  // lista dzieci
  go('menu', () => { const n = f.children.find(c => c.name === 'Kid menu'); if (!n) return; const i = inst('Child menu'); const x = n.x, y = n.y; replace(n, i); i.layoutPositioning = 'ABSOLUTE'; i.x = x; i.y = y; bump('menu'); });
  // rozwijane grupy
  go('disclosure', () => { for (const n of f.findAll(x => x.type === 'FRAME' && x.name === 'Summary' && T(x).length >= 1 && T(x).some(t => /^(Pokaż|Zrobione|Archiwum|Oferta)/.test(t.characters)))) {
    const label = T(n).find(t => /^(Pokaż|Zrobione|Archiwum|Oferta)/.test(t.characters)); const expanded = T(n).some(t => t.characters === '▾');
    const i = inst('Disclosure', 'Expanded=' + (expanded ? 'True' : 'False')); setP(i, 'Label', label.characters); replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('disclosure'); } });
  // pozycje zrobione i zarchiwizowane
  go('completed', () => { for (const n of f.findAll(x => x.type === 'FRAME' && x.name === 'List Item' && T(x).some(t => t.textDecoration === 'STRIKETHROUGH') && x.findAll(y => y.type === 'INSTANCE' && y.name === 'Button').length)) {
    const title = T(n).find(t => t.textDecoration === 'STRIKETHROUGH'); const i = inst('Completed row'); setP(i, 'Title', title.characters); replace(n, i); i.layoutSizingHorizontal = 'FILL'; bump('completed'); } });
  progress((fi + 1) / s.children.length, s.name[0] + ' ' + f.name.slice(0, 18)); }
return { stat, errors: errors.slice(0, 14) };
