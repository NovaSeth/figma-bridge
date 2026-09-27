//# DS P3.a: ikony Material jako komponenty wektorowe
const NAMES = ['home', 'task_alt', 'grading', 'mail', 'calendar_month', 'chevron_right', 'chevron_left', 'expand_more', 'expand_less', 'check', 'close', 'add', 'error', 'settings', 'reply', 'send', 'attach_file', 'arrow_back', 'add_a_photo', 'campaign', 'event_available', 'record_voice_over', 'person', 'face', 'edit', 'inbox'];
const { s, b } = await board('Atomy', 2000);
let grid = b.findOne(n => n.name === 'Icon grid');
if (!grid) { grid = box('Icon grid', 'HORIZONTAL', { gap: 'lg', layoutWrap: 'WRAP', pad: ['xl', 'xl'], fill: 'surface' }); grid.counterAxisSpacing = 16; radius(grid, 'xl'); await entry(b, 'Icon', 'Ikonografia: Material Icons (Material Design). Każda ikona to komponent wektorowy 24 px z wypełnieniem color/on-surface. W komponentach ikony podmienia się przez INSTANCE_SWAP, kolor nadpisuje się na warstwie wektora. Rozmiary: 16 (chipy), 20 (kafle), 24 (wiersze, nawigacja), 28 (ustawienia).', grid); grid.counterAxisSizingMode = 'AUTO'; grid.primaryAxisSizingMode = 'FIXED'; grid.resize(900, grid.height); }
let made = 0;
for (const [i, name] of NAMES.entries()) {
  if (findComp('Icon/' + name)) continue;
  const t = figma.createText(); t.fontName = MI; t.fontSize = 24; t.lineHeight = { unit: 'PIXELS', value: 24 }; t.characters = name;
  const c = figma.createComponent(); c.name = 'Icon/' + name; c.resize(24, 24); c.fills = []; c.clipsContent = false; c.description = 'Material Icons: ' + name;
  c.appendChild(t); t.x = 0; t.y = 0;
  const v = figma.flatten([t], c); v.name = 'Vector'; v.fills = paint('on-surface'); v.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
  grid.appendChild(c); made++;
  if (i % 6 === 0) progress(i / NAMES.length, 'Ikona ' + name);
}
fitSection(s, b);
await shot(grid, { name: 'ds-icons', scale: 1 });
return { made, total: NAMES.length, boardId: b.id };
