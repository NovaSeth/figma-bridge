//# #40: Plan z własnymi zajęciami (przycisk, legenda, blok, arkusz dodawania)
const GREEN = { 'Jasny motyw': { bg: '#CEEAD6', fg: '#0D652D' }, 'Ciemny motyw': { bg: '#0F5223', fg: '#A8DAB5' } };
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
const MI = { family: 'Material Icons', style: 'Regular' }; await figma.loadFontAsync(MI);
for (const { f, T, s } of screens()) { try {
  if (!/^1[5-8] /.test(f.name)) continue;
  const g = GREEN[s.name], main = f.children[1];
  // legenda: „Własne"
  const school = texts(main).find(t => t.characters === 'Szkoła' && t.parent.cornerRadius === 8);
  if (school && !texts(main).some(t => t.characters === 'Własne')) { const chip = school.parent.clone(); school.parent.parent.appendChild(chip); chip.fills = solid(g.bg); for (const t of texts(chip)) { t.fills = solid(g.fg); } await setText(texts(chip)[0], 'Własne'); bump('legend'); }
  // przycisk pływający „Dodaj zajęcia"
  if (!f.children.some(c => c.name === 'FAB - Dodaj zajęcia')) {
    const src = s.children.find(n => n.name.startsWith('07 ')).children.find(c => c.layoutPositioning === 'ABSOLUTE' && texts(c).some(t => t.characters === 'Napisz'));
    const fab = src.clone(); fab.name = 'FAB - Dodaj zajęcia'; f.appendChild(fab); fab.layoutPositioning = 'ABSOLUTE';
    await setText(texts(fab).find(t => t.characters === 'Napisz'), 'Dodaj zajęcia');
    const ic = fab.findOne(n => n.type === 'TEXT' && n.characters === 'edit'); if (ic) { await figma.loadFontAsync(ic.fontName); ic.fontName = MI; ic.characters = 'add'; ic.name = 'add'; }
    const nav = f.children.find(c => c.name.startsWith('Navigation'));
    fab.x = f.width - fab.width - 16; fab.y = nav.y - fab.height - 13; bump('fab');
  }
  // przykładowy blok własnych zajęć w widoku dnia
  if (/^15 /.test(f.name) && !texts(main).some(t => t.characters === 'Koniki')) {
    const lesson = texts(main).find(t => t.characters === 'Edukacja wczesnoszkolna' && t.fontSize === 14);
    let block = lesson; while (block && block.cornerRadius !== 9) block = block.parent;
    if (block) { const b = block.clone(); block.parent.appendChild(b); b.layoutPositioning = 'ABSOLUTE'; b.x = block.x; b.y = 9 * 60; b.resize(block.width, 60); b.fills = solid(g.bg);
      const ts = texts(b); await setText(ts[0], 'Koniki'); if (ts[1]) await setText(ts[1], '16:00 do 17:00, własne zajęcia'); for (const t of ts) t.fills = solid(g.fg); bump('block'); }
    for (const t of texts(main).filter(t => /^4 lekcje, od 7:45/.test(t.characters))) await setText(t, t.characters.replace('Sprzątanie Świata.', 'Sprzątanie Świata. Koniki o 16:00.'));
  }
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }

// arkusz „Nowe zajęcia"
const light = sections[0], T = THEMES['Jasny motyw'];
const get = p => light.children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
if (!get('15a')) {
  const src = get('15 '), after = src;
  for (const fr of light.children.filter(n => n.type === 'FRAME' && Math.abs(n.y - after.y) < 2 && n.x > after.x)) fr.x += 522;
  const nf = src.clone(); light.appendChild(nf); nf.name = '15a Plan · nowe zajęcia'; nf.x = after.x + 522; nf.y = after.y;
}
const a = get('15a');
if (!a.children.some(c => c.name === 'Bottom sheet')) {
  const main = a.children[1]; main.clipsContent = true; a.clipsContent = true; a.primaryAxisSizingMode = 'FIXED'; a.resize(a.width, 874); main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1;
  const fab = a.children.find(c => c.name === 'FAB - Dodaj zajęcia'); if (fab) fab.remove();
  const ref = get('02e'); const scrim = ref.children.find(c => c.name === 'Scrim').clone(); a.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = 0;
  const sheet = ref.children.find(c => c.name === 'Bottom sheet').clone(); a.appendChild(sheet); sheet.layoutPositioning = 'ABSOLUTE'; sheet.x = 0;
  await setText(texts(sheet.findOne(n => n.name === 'Bar'))[0], 'Własne zajęcia');
  const body = sheet.findOne(n => n.name === 'Body'); [...body.children].forEach(c => c.remove()); body.itemSpacing = 0; body.paddingBottom = 16;
  const add = n => { body.appendChild(n); n.layoutSizingHorizontal = 'FILL'; return n; };
  const title = al('Title', 'VERTICAL', { paddingBottom: 6 }); title.appendChild(mk('Nowe zajęcia', 'Extra Bold', 24, T.ink, 120)); add(title);
  const field = (label, value, placeholder) => { const w = al('Field', 'VERTICAL', { itemSpacing: 6, paddingTop: 12 }); w.appendChild(mk(label, 'Semi Bold', 14, T.ink, 140));
    const box = al('Input', 'HORIZONTAL', { paddingLeft: 14, paddingRight: 14, cornerRadius: 14, counterAxisAlignItems: 'CENTER' }); box.fills = solid(T.bg); box.strokes = solid(T.ring); box.strokeWeight = 1.5; box.strokeAlign = 'INSIDE';
    box.appendChild(mk(value || placeholder, 'Regular', 16, value ? T.ink : T.sec)); w.appendChild(box); box.layoutSizingHorizontal = 'FILL'; box.counterAxisSizingMode = 'FIXED'; box.resize(box.width, 48); return w; };
  add(field('Nazwa', null, 'np. koniki, angielski'));
  const rowDT = al('Row', 'HORIZONTAL', { itemSpacing: 10 }); add(rowDT);
  for (const [l, v] of [['Dzień', 'piątek'], ['Od', '16:00'], ['Do', '17:00']]) { const fl = field(l, v); rowDT.appendChild(fl); fl.layoutGrow = 1; fl.children[1].layoutSizingHorizontal = 'FILL'; }
  add(field('Miejsce (opcjonalnie)', null, 'np. stajnia w Ładach'));
  const rep = al('Repeat', 'HORIZONTAL', { paddingTop: 16, counterAxisAlignItems: 'CENTER', itemSpacing: 12 });
  const rc = al('Text', 'VERTICAL', { itemSpacing: 1 }); rc.appendChild(mk('Powtarzaj co tydzień', 'Semi Bold', 17, T.ink, 130)); rc.appendChild(mk('Zajęcia pojawią się w każdy piątek', 'Regular', 15, T.sec, 135)); rep.appendChild(rc); rc.layoutGrow = 1;
  const sw = al('Switch', 'HORIZONTAL', { cornerRadius: 999, paddingLeft: 2, paddingRight: 2, counterAxisAlignItems: 'CENTER', primaryAxisAlignItems: 'MAX' }); sw.primaryAxisSizingMode = 'FIXED'; sw.counterAxisSizingMode = 'FIXED'; sw.resize(51, 31); sw.fills = solid(T.tint); const k = figma.createEllipse(); k.resize(27, 27); k.fills = solid('#FFFFFF'); sw.appendChild(k); rep.appendChild(sw);
  add(rep);
  const actions = get('02b').findOne(n => n.name === 'Actions').clone(); sheet.appendChild(actions); actions.layoutSizingHorizontal = 'FILL';
  const [p] = actions.children; const pl = texts(p).find(t => t.fontName.family === 'Inter'); await setText(pl, 'Zapisz'); const pi = p.findOne(n => n.type === 'TEXT' && n.fontName.family !== 'Inter'); if (pi) pi.remove();
  body.layoutSizingVertical = 'HUG'; sheet.y = a.height - sheet.height; bump('sheet');
}
relayout();
await shot(get('15 '), { name: 'v-15', scale: 0.5 });
await shot(a, { name: 'v-15a', scale: 0.7 });
return { log, errors };
