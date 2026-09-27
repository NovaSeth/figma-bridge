//# Naprawa: listy utworzone dla spraw mają dopasowywać wysokość do treści
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
let fixed = 0; const errors = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) { try {
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  for (const list of main.findAll(x => x.type === 'FRAME' && x.name === 'List' && x.layoutMode === 'VERTICAL' && x.children.some(c => c.type === 'INSTANCE' && c.name === 'List row'))) {
    if (list.layoutSizingVertical !== 'HUG') { list.layoutSizingVertical = 'HUG'; fixed++; }
    for (let p = list.parent; p && p !== main; p = p.parent) { try { if (p.layoutMode !== 'NONE' && p.layoutSizingVertical === 'FIXED') p.layoutSizingVertical = 'HUG'; } catch (e) {} }
  }
  main.layoutGrow = 0; main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
  if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1; }
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); if (sheet) sheet.y = f.height - sheet.height;
} catch (e) { errors.push(f.name.slice(0, 14) + ': ' + e.message); } }
// układ rzędów po zmianie wysokości
const PAD = 160, LABEL_H = 120, ROW_GAP = 280;
for (const section of page.children.filter(n => n.type === 'SECTION')) { const frames = section.children.filter(n => n.type === 'FRAME'), labels = section.children.filter(n => n.type === 'TEXT').sort((a, b) => a.y - b.y);
  let y = PAD, right = 0;
  for (const label of labels) { const row = frames.filter(fr => Math.abs(fr.y - (label.y + LABEL_H)) < 2); label.y = y; y += LABEL_H; let h = 0; for (const fr of row) { fr.y = y; h = Math.max(h, fr.height); right = Math.max(right, fr.x + fr.width); } y += h + ROW_GAP; }
  section.resizeWithoutConstraints(Math.max(section.width, right + PAD), y - ROW_GAP + PAD); }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('01 '), { name: 'c-69', scale: 0.45 });
return { fixed, errors };
