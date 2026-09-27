//# #37: chip „termin dziś" na zielono + przywrócenie białej karty KPI
const GREEN = { 'Jasny motyw': { bg: '#CEEAD6', fg: '#0D652D' }, 'Ciemny motyw': { bg: '#0F5223', fg: '#A8DAB5' } };
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; };
const isToday = label => !/\d:\d\d/.test(label) && /dziś/i.test(label);
for (const { f, T, s } of screens()) {
  const main = f.children[1]; if (!main || main.name !== 'Main Content') continue;
  const g = GREEN[s.name];
  const scopes = /Zadania/.test(f.name) ? [main] : main.findAll(n => n.type === 'FRAME' && n.cornerRadius === 20 && texts(n).some(t => t.characters === 'Zrobione'));
  for (const scope of scopes) for (const chip of scope.findAll(n => n.type === 'FRAME' && n.name === 'Chip' && n.cornerRadius === 8)) {
    const lab = texts(chip).find(t => !isIcon(t)); if (!lab || !isToday(lab.characters)) continue;
    chip.fills = solid(g.bg); for (const t of texts(chip)) t.fills = solid(g.fg); bump('today');
  }
}
const ds = page.findOne(n => n.name === 'DS · chip terminu');
if (ds) { const row = ds.children.filter(c => c.name === 'Rule')[1]; const chip = row.findOne(n => n.name === 'Chip'); chip.fills = solid(GREEN['Jasny motyw'].bg); for (const t of texts(chip)) t.fills = solid(GREEN['Jasny motyw'].fg); const d = row.children.find(c => c.type === 'TEXT'); await setText(d, 'Termin dziś: chip zielony, bez ikony'); bump('ds'); }
const T = THEMES['Jasny motyw'];
const summary = sections[0].children.find(n => n.name.startsWith('02f')).findOne(n => n.name === 'Summary');
summary.fills = solid(T.card); const st = texts(summary); st[0].fills = solid(T.ok); st[1].fills = solid(T.ink); st[2].fills = solid(T.sec);
await shot(sections[0].children.find(n => n.name.startsWith('02f')), { name: 'v-02f', scale: 0.6 });
await shot(ds, { name: 'v-ds', scale: 0.6 });
return log;
