//# #43 #44 #45: chip „Nowe" zamiast kropki, bez „Otwórz w Librusie", bez ikony aparatu
const TONAL = { 'Jasny motyw': { bg: '#D3E3FD', fg: '#041E49' }, 'Ciemny motyw': { bg: '#0A3A86', fg: '#D3E3FD' } };
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
for (const { f, T, s } of screens()) { try {
  const g = TONAL[s.name];
  // #45 plakietka aparatu
  for (const b of f.findAll(n => n.name === 'Avatar badge')) { b.remove(); bump('badge'); }
  // #44 przycisk „Otwórz w Librusie" w arkuszu ogłoszenia
  for (const t of texts(f).filter(t => t.characters === 'Otwórz w Librusie')) { let a = t; while (a && a.name !== 'Actions') a = a.parent; if (a) { const sheet = a.parent, body = sheet.findOne(n => n.name === 'Body'); a.remove(); body.paddingBottom = 28; const target = Math.round(874 * 0.64); body.layoutSizingVertical = 'HUG'; if (sheet.height > target) { body.layoutSizingVertical = 'FIXED'; body.resize(body.width, target - 44 - (sheet.findOne(n => n.name === 'Bar') ? 44 : 0)); } sheet.y = f.height - sheet.height; bump('librus'); } }
  // #43 kropka → chip „Nowe"
  for (const dot of f.findAll(n => n.name === 'Unread')) {
    let row = dot; while (row && !(row.type === 'FRAME' && texts(row).some(t => t.fontSize === 15 || t.fontSize === 13) && row.findOne(n => n.name === 'Chip' || n.name === 'Chips'))) row = row.parent;
    const chipSrc = f.findOne(n => n.type === 'FRAME' && n.name === 'Chip' && n.cornerRadius === 8);
    const wrap = dot.parent.name === 'Dot' ? dot.parent : dot; const holder = wrap.parent; wrap.remove();
    if (!chipSrc || !row) { bump('dot-removed'); continue; }
    const firstChip = row.findOne(n => n.type === 'FRAME' && n.name === 'Chip' && n.cornerRadius === 8); const chipRow = firstChip ? firstChip.parent : null;
    const chip = chipSrc.clone(); for (const ic of chip.findAll(isIcon)) (ic.parent !== chip && ic.parent.children.length === 1 ? ic.parent : ic).remove(); const mark = chip.children.find(c => c.name === 'error'); if (mark) mark.remove();
    chip.fills = solid(g.bg); const lab = texts(chip)[0]; await setText(lab, 'Nowe'); lab.fills = solid(g.fg); chip.paddingLeft = 9; chip.name = 'Chip';
    if (chipRow) chipRow.insertChild(0, chip); else { const col = holder.parent; const r = al('Chips', 'HORIZONTAL', { paddingTop: 7, itemSpacing: 6 }); r.appendChild(chip); col.appendChild(r); }
    bump('nowe');
  }
  for (const t of texts(f).filter(t => /, 1 nieprzeczytane$/.test(t.characters))) await setText(t, t.characters.replace(', 1 nieprzeczytane', ', 1 nowe'));
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
const f01 = get('01 '); const nh = texts(f01).find(t => t.characters === 'Ogłoszenia szkolne'); let secN = nh; while (secN.parent !== f01.children[1]) secN = secN.parent;
await shot(secN, { name: 'v-notices', scale: 0.8 });
await shot(get('07 ').children[1].findOne(n => n.name === 'MsgList' && n.cornerRadius === 20), { name: 'v-07list', scale: 0.5 });
await shot(get('02c'), { name: 'v-02c', scale: 0.5 });
await shot(f01.children[0], { name: 'v-hdr', scale: 1.5 });
return { log, errors };
