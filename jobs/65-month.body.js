// #30 godziny lekcji w widoku miesiąca + poprawka nazwisk przy kropce nieprzeczytanej
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = []; let gridInfo = null;
const HOURS = ['7:45–12:20', '7:45–11:25', '7:45–12:20', '7:45–11:25', '7:45–11:25']; // pon.–pt., jak w widoku dnia i tygodnia
for (const { f, T } of screens()) { try {
  const main = f.children[1]; if (!main) continue;
  if (/^07 /.test(f.name)) for (const dot of main.findAll(n => n.name === 'Unread')) { const tw = dot.parent, name = texts(tw)[0]; tw.layoutSizingHorizontal = 'FILL'; name.layoutGrow = 1; name.textAutoResize = 'HEIGHT'; tw.counterAxisAlignItems = 'MIN'; dot.y = 0; const w = al('Dot', 'VERTICAL', { paddingTop: 8 }); tw.insertChild(0, w); w.appendChild(dot); bump('name-wrap'); }
  if (!/^17 /.test(f.name)) continue;
  const grid = main.findOne(n => n.name === 'MonthGrid');
  const cells = grid.children.filter(c => c.name.startsWith('Button - '));
  const chipSrc = grid.findOne(n => n.type === 'FRAME' && n.cornerRadius === 4);
  gridInfo = { layout: grid.layoutMode, rows: 'gridRowSizes' in grid ? JSON.stringify(grid.gridRowSizes) : 'n/a', cells: cells.length, first: cells[0].name };
  for (const [i, cell] of cells.entries()) {
    const wd = i % 7; if (wd > 4) continue;
    const m = cell.name.match(/^Button - (\d+) (\S+)/); if (!m) continue;
    const day = Number(m[1]), month = m[2];
    if (month.startsWith('sierp')) continue;               // przed początkiem roku szkolnego
    if (cell.children.some(c => c.name === 'Lessons')) continue;
    const chip = chipSrc.clone(); chip.name = 'Lessons';
    chip.fills = solid(T.tonal);
    const t = texts(chip)[0]; await setText(t, HOURS[wd]); t.fontSize = 9; t.fills = solid(T.onTonal); t.letterSpacing = { unit: 'PIXELS', value: -0.2 };
    chip.paddingLeft = 1; chip.paddingRight = 1; chip.primaryAxisAlignItems = 'CENTER'; chip.counterAxisAlignItems = 'CENTER';
    cell.insertChild(1, chip); chip.layoutSizingHorizontal = 'FILL';
    bump('lessons');
  }
  // komórki z trzema wpisami potrzebują wyższych wierszy
  if ('gridRowSizes' in grid) { try { grid.gridRowSizes = grid.gridRowSizes.map((r, i) => i === 0 ? r : { type: 'FIXED', value: 92 }); bump('rows'); } catch (e) { errors.push('rows: ' + e.message); } }
  refit(f);
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
relayout();
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('17 '), { name: 'v-17', scale: 1 });
const m07 = get('07 '); await shot(m07.children[1].findOne(n => n.name === 'MsgList' && n.cornerRadius === 20).children[1], { name: 'v-07row', scale: 1 });
return { log, errors, gridInfo };
