//# Diagnostyka przerw na dole ekranów z arkuszem + góra ekranu 01
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const all = page.children.flatMap(s => s.type === 'SECTION' ? s.children.filter(n => n.type === 'FRAME').map(f => ({ f, s: s.name })) : []);
const rows = [];
for (const { f, s } of all) { const sheet = f.children.find(c => c.name === 'Bottom sheet'); const nav = f.children.find(c => c.name && c.name.startsWith('Tab bar')) || f.children[f.children.length - 1];
  const main = f.children.find(c => c.name === 'Main Content');
  const gapSheet = sheet ? Math.round(f.height - (sheet.y + sheet.height)) : null;
  const navNode = f.findAll(x => x.type === 'INSTANCE' && x.name === 'Tab bar')[0];
  const gapNav = navNode ? Math.round(f.height - (navNode.absoluteBoundingBox.y - f.absoluteBoundingBox.y + navNode.height)) : null;
  if ((gapSheet != null && Math.abs(gapSheet) > 1) || (gapNav != null && Math.abs(gapNav) > 1)) rows.push(s[0] + ' ' + f.name.slice(0, 26) + ' h=' + Math.round(f.height) + ' sheetGap=' + gapSheet + ' navGap=' + gapNav);
}
for (const p of ['02 ', '02a', '02c', '02f', '16 ']) { const fr = all.find(x => x.f.name.startsWith(p) && x.s === 'Jasny motyw'); if (fr) await shot(fr.f, { name: 'g-' + p.trim(), scale: 0.45 }); }
return rows;
