//# Ekrany z warstwą modalną: stała wysokość telefonu, treść przycięta, arkusz przy dole
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const overlay = f.children.find(c => ['Bottom sheet', 'Kid menu', 'Scrim'].includes(c.name)); if (!overlay) continue;
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  const before = Math.round(f.height);
  f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); f.clipsContent = true;
  main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1; main.clipsContent = true;
  const scrim = f.children.find(c => c.name === 'Scrim'); if (scrim) { scrim.resize(f.width, f.height); scrim.x = 0; scrim.y = 0; }
  const sheet = f.children.find(c => c.name === 'Bottom sheet');
  if (sheet) { const full = /^02[ab]/.test(f.name); const body = sheet.findOne(n => n.name === 'Body');
    const fixed = sheet.children.filter(c => c !== body).reduce((a, c) => a + c.height, 0);
    const target = full ? 874 - 52 : Math.round(874 * 0.64);
    if (body) { body.layoutSizingVertical = 'FIXED'; body.resize(body.width, Math.max(target - fixed, 140)); }
    sheet.y = 874 - sheet.height; }
  const menu = f.children.find(c => c.name === 'Kid menu'); if (menu) { const hdr = f.children.find(c => c.name === 'App header'); menu.y = (hdr ? hdr.height : 82) + 6; }
  out.push(f.name.slice(0, 24) + ': ' + before + ' → ' + Math.round(f.height) + (sheet ? ', arkusz ' + Math.round(sheet.height) : ''));
}
// układ rzędów po zmianie wysokości
const PAD = 160, LABEL_H = 120, ROW_GAP = 280;
for (const section of page.children.filter(n => n.type === 'SECTION')) { const frames = section.children.filter(n => n.type === 'FRAME'), labels = section.children.filter(n => n.type === 'TEXT').sort((a, b) => a.y - b.y);
  let y = PAD, right = 0;
  for (const label of labels) { const row = frames.filter(fr => Math.abs(fr.y - (label.y + LABEL_H)) < 2); label.y = y; y += LABEL_H; let h = 0; for (const fr of row) { fr.y = y; h = Math.max(h, fr.height); right = Math.max(right, fr.x + fr.width); } y += h + ROW_GAP; }
  section.resizeWithoutConstraints(Math.max(section.width, right + PAD), y - ROW_GAP + PAD); }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
for (const [p, n] of [['02 ', 's-02'], ['02d', 's-02d'], ['15a', 's-15a']]) { const f = get(p); if (f) await shot(f, { name: n, scale: 0.5 }); }
return out;
