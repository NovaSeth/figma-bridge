// #15–#21: Teraz (tagi, szewrony, nieprzeczytane) i Zadania (reguła terminu, lista Zrobione)
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; };
const centeredChevron = (T) => { const w = al('Chevron', 'VERTICAL', { primaryAxisAlignItems: 'CENTER' }); w.appendChild(icon('chevron_right', 24, T.sec)); return w; };
const addChevron = (container, T) => { if (container.children.some(c => c.name === 'Chevron')) return; const w = centeredChevron(T); container.appendChild(w); w.layoutSizingVertical = 'FILL'; bump('chevron'); };
const styleChip = async (chip, T, kind) => {
  const due = kind !== 'upcoming';
  chip.fills = solid(due ? T.dueBg : T.chip);
  for (const t of texts(chip)) t.fills = solid(due ? T.due : T.sec);
  const mark = chip.children.find(c => c.name === 'error');
  if (kind === 'overdue' && !mark) chip.appendChild(icon('error', 16, T.due));
  if (kind !== 'overdue' && mark) mark.remove();
};
const kindOf = label => /\d:\d\d/.test(label) ? null : /(11|17) wrz/.test(label) ? 'overdue' : /dziś/i.test(label) ? 'today' : /21 wrz/.test(label) ? 'upcoming' : null;

const errors = [];
for (const { f, T } of screens()) { try {
  const main = f.children[1]; if (!main || main.name !== 'Main Content') continue;
  let all = texts(main);
  // #15 data jako tag
  const when = all.find(t => t.characters === '14 wrz' && t.fontSize === 13 && t.parent.name !== 'Chip');
  if (when) {
    const body = when.parent.parent.parent; // kolumna tekstu wiersza
    const chipSrc = main.findOne(n => n.type === 'FRAME' && n.name === 'Chip' && n.cornerRadius === 8 && n.findOne(isIcon));
    when.parent.remove();
    if (chipSrc) { const wrap = al('Chips', 'HORIZONTAL', { paddingTop: 7, itemSpacing: 6 }); const chip = chipSrc.clone(); wrap.appendChild(chip); const lab = texts(chip).find(t => !isIcon(t)); await setText(lab, '14 wrz'); await styleChip(chip, T, 'upcoming'); body.appendChild(wrap); }
    bump('date-tag');
    all = texts(main);
  }
  // #16 #17 szewrony w wierszach Frekwencja i Brak ocen
  for (const title of all.filter(t => ['Frekwencja: pełna obecność', 'Brak ocen'].includes(t.characters) && t.fontSize === 17)) {
    let c = title; while (c && !(c.type === 'FRAME' && c.layoutMode === 'HORIZONTAL' && c.itemSpacing === 12)) c = c.parent;
    if (c) addChevron(c, T);
  }
  for (const t of all.filter(t => t.characters === 'Brak danych o ocenach, także opisowych.')) { await setText(t, 'Nie ma jeszcze ocen, także opisowych'); bump('oceny-copy'); }
  // #18 #19 ogłoszenia: szewron na środku wiersza, znacznik nieprzeczytanych
  const nh = all.find(t => t.characters === 'Ogłoszenia szkolne' && t.fontSize === 20);
  if (nh) {
    const section = nh.parent.parent, list = section.findOne(n => n.type === 'FRAME' && n.cornerRadius === 20);
    const rows = list ? list.children.filter(r => r.type === 'FRAME' && texts(r).some(t => t.fontSize === 17)) : [];
    for (const [i, row] of rows.entries()) {
      if (row.children.some(c => c.name === 'Chevron')) continue;
      const old = row.findOne(n => n.name === 'chevron_right'); if (old) old.remove();
      const flow = row.children.filter(c => c.layoutPositioning !== 'ABSOLUTE');
      const col = al('Text', 'VERTICAL');
      row.layoutMode = 'HORIZONTAL'; row.itemSpacing = 8; row.counterAxisAlignItems = 'MIN';
      row.appendChild(col); flow.forEach(c => { col.appendChild(c); c.layoutSizingHorizontal = 'FILL'; });
      col.layoutGrow = 1; row.layoutSizingHorizontal = 'FILL'; row.layoutSizingVertical = 'HUG';
      const titleT = texts(col).find(t => t.fontSize === 17), tw = titleT.parent;
      tw.layoutMode = 'HORIZONTAL'; tw.primaryAxisAlignItems = 'MIN'; tw.counterAxisAlignItems = 'CENTER'; tw.itemSpacing = 7;
      if (i === 0) { const dot = figma.createEllipse(); dot.name = 'Unread'; dot.resize(8, 8); dot.fills = solid(T.tint); tw.insertChild(0, dot); }
      else { titleT.fontName = { family: 'Inter', style: 'Regular' }; }
      addChevron(row, T);
    }
    const sub = texts(section).find(t => /dotycz/.test(t.characters) && t.fontSize === 15);
    if (sub && rows.length && !sub.characters.includes('nieprzeczytane')) await setText(sub, sub.characters + ', 1 nieprzeczytane');
  }
  // #20 reguła terminu na chipach zadań
  const taskScope = /Zadania/.test(f.name) ? [main] : main.findAll(n => n.type === 'FRAME' && n.cornerRadius === 20 && texts(n).some(t => t.characters === 'Zrobione'));
  for (const scope of taskScope) for (const chip of scope.findAll(n => n.type === 'FRAME' && n.name === 'Chip' && n.cornerRadius === 8)) {
    const lab = texts(chip).find(t => !isIcon(t)); const k = lab && kindOf(lab.characters);
    if (k) { await styleChip(chip, T, k); bump('chip-' + k); }
  }
  // #21 lista Zrobione/Archiwum
  for (const item of main.findAll(n => n.type === 'FRAME' && n.name === 'List Item')) {
    if (item.paddingLeft === 16) continue;
    const list = item.parent;
    item.paddingLeft = 16; item.paddingRight = 12; item.paddingTop = 10; item.paddingBottom = 10; item.counterAxisAlignItems = 'CENTER';
    if (item.layoutMode === 'NONE') item.layoutMode = 'HORIZONTAL';
    item.layoutSizingHorizontal = 'FILL'; item.counterAxisSizingMode = 'AUTO';
    const col = item.children[0]; col.layoutGrow = 1;
    for (const t of texts(col)) { t.textDecoration = 'STRIKETHROUGH'; t.fills = solid(T.sec); t.layoutSizingHorizontal = 'FILL'; }
    if (list.children.indexOf(item) > 0) { item.strokes = solid(T.sep); item.strokeWeight = 1; item.strokeAlign = 'INSIDE'; item.strokeBottomWeight = 0; item.strokeLeftWeight = 0; item.strokeRightWeight = 0; item.strokeTopWeight = 1; }
    if (list.layoutMode === 'NONE') { list.layoutMode = 'VERTICAL'; list.counterAxisSizingMode = 'FIXED'; }
    list.primaryAxisSizingMode = 'AUTO'; list.clipsContent = true;
    for (let p = list.parent; p && p !== main; p = p.parent) if ('layoutSizingVertical' in p && p.layoutMode !== 'NONE') { try { p.layoutSizingVertical = 'HUG'; } catch (e) {} }
    bump('done-item');
  }
  refit(f);
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
// Reguła w DS: karta z trzema stanami chipa terminu
if (!page.findOne(n => n.name === 'DS · chip terminu')) {
  const T = THEMES['Jasny motyw'];
  const z = sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith('04 '));
  const pick = k => z.findAll(n => n.type === 'FRAME' && n.name === 'Chip').find(c => { const l = texts(c).find(t => !isIcon(t)); return l && kindOf(l.characters) === k; });
  const card = al('DS · chip terminu', 'VERTICAL', { itemSpacing: 14, paddingTop: 28, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, cornerRadius: 24 });
  card.fills = solid('#FFFFFF');
  card.appendChild(mk('Reguła DS: chip terminu zadania', 'Bold', 28, T.ink, 125));
  for (const [k, d] of [['overdue', 'Po terminie: kolor ostrzegawczy i ikona wykrzyknika po dacie'], ['today', 'Termin dziś: kolor ostrzegawczy, bez ikony'], ['upcoming', 'Termin w przyszłości: chip neutralny']]) {
    const r = al('Rule', 'HORIZONTAL', { itemSpacing: 16, counterAxisAlignItems: 'CENTER' }); const src = pick(k); if (src) { const c = src.clone(); r.appendChild(c); c.layoutSizingHorizontal = 'HUG'; c.layoutSizingVertical = 'FIXED'; }
    r.appendChild(mk(d, 'Regular', 20, T.sec, 140)); card.appendChild(r);
  }
  page.appendChild(card); card.x = 2600; card.y = -560;
}
relayout();
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
const f01 = get('01 '); const p3 = texts(f01).find(t => t.characters.startsWith('Logopedia')); let sec3 = p3; while (sec3.parent !== f01.children[1]) sec3 = sec3.parent;
await shot(sec3, { name: 'v-p3', scale: 1 });
const nh = texts(f01).find(t => t.characters === 'Ogłoszenia szkolne'); let secN = nh; while (secN.parent !== f01.children[1]) secN = secN.parent;
await shot(secN, { name: 'v-notices', scale: 1 });
await shot(get('05 '), { name: 'v-05', scale: 1 });
await shot(page.findOne(n => n.name === 'DS · chip terminu'), { name: 'v-ds', scale: 0.6 });
return { log, errors };
