//# #57 #58 #59: jedno pole terminu, usunięcie pola miejsca, godzina w komunikacie
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const C = {}; for (const c of ds.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) if (c.parent.type !== 'COMPONENT_SET') C[c.name] = c;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); } catch (e) {} } };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME' && n.name.startsWith('15a'))) {
  const body = f.findOne(n => n.name === 'Body'); if (!body) continue;
  const row = body.children.find(c => c.name === 'Row');
  if (row) { // #57: jedno pole „Kiedy" otwierające wybór dnia i godzin
    const wrap = figma.createFrame(); wrap.name = 'Field'; wrap.fills = []; wrap.layoutMode = 'VERTICAL'; wrap.primaryAxisSizingMode = 'AUTO'; wrap.counterAxisSizingMode = 'AUTO'; wrap.itemSpacing = 6; wrap.paddingTop = 12;
    const idx = body.children.indexOf(row); body.insertChild(idx, wrap); wrap.layoutSizingHorizontal = 'FILL';
    const fld = C['Text field'].children.find(v => v.name === 'Type=Single, State=Filled').createInstance();
    setP(fld, 'Show label', true); setP(fld, 'Label', 'Kiedy'); setP(fld, 'Value', 'piątek, 16:00 do 17:00');
    wrap.appendChild(fld); fld.layoutSizingHorizontal = 'FILL';
    const input = fld.findOne(n => n.name === 'Input');
    if (input) { input.primaryAxisAlignItems = 'SPACE_BETWEEN'; }
    row.remove(); out.push(f.name.slice(0, 12) + ' #57 jedno pole'); }
  const place = body.children.find(c => c.name === 'Field' && T(c).some(t => /Miejsce/.test(t.characters)));
  if (place) { place.remove(); out.push(f.name.slice(0, 12) + ' #58 usunięto miejsce'); }
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); if (sheet) sheet.y = f.height - sheet.height;
}
// #59: godzina w komunikacie o ostatnich poprawnych danych
let n59 = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const i of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Banner')) { const t = T(i)[0]; if (!t || !/18\.09\.2026\.$/.test(t.characters)) continue;
    setP(i, 'Text', t.characters.replace('18.09.2026.', '18.09.2026, 15:20.')); n59++; }
  for (const t of f.findAllWithCriteria({ types: ['TEXT'] })) if (/ostatnie poprawne dane z 18\.09\.2026\.$/.test(t.characters)) { await figma.loadFontAsync(t.fontName); t.characters = t.characters.replace('18.09.2026.', '18.09.2026, 15:20.'); n59++; }
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('15a'), { name: 'c-15a', scale: 0.5 }); await shot(get('20 '), { name: 'c-20', scale: 0.45 });
return { out, n59 };
