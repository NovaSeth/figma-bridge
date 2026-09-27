//# #50–#54: arkusze i nawigacja przyklejone do dołu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const fixed = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); const scrim = f.children.find(c => c.name === 'Scrim');
  if (sheet) { const gap = f.height - (sheet.y + sheet.height); if (Math.abs(gap) > 0.5) { sheet.y = f.height - sheet.height; fixed.push(s.name[0] + ' ' + f.name.slice(0, 22) + ' arkusz ' + Math.round(gap)); } }
  if (scrim) { scrim.x = 0; scrim.y = 0; scrim.resize(f.width, f.height); }
  const menu = f.children.find(c => c.name === 'Child menu');
  const main = f.children.find(c => c.name === 'Main Content');
  const nav = f.findAll(x => x.type === 'INSTANCE' && x.name === 'Tab bar')[0];
  if (nav && main) { const gap = f.height - (nav.absoluteBoundingBox.y - f.absoluteBoundingBox.y + nav.height);
    if (gap > 1) { main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1; const g2 = f.height - (nav.absoluteBoundingBox.y - f.absoluteBoundingBox.y + nav.height); fixed.push(s.name[0] + ' ' + f.name.slice(0, 22) + ' nawigacja ' + Math.round(gap) + '→' + Math.round(g2)); } }
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
for (const p of ['02 ', '12 ', '16 ', '02f']) { const fr = get(p); if (fr) await shot(fr, { name: 'g-' + p.trim(), scale: 0.45 }); }
return fixed;
