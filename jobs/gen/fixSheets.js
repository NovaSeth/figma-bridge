//# opis: arkusze dopasowane do swojej tresci
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const sheet = f.children.find(c => c.layoutPositioning === 'ABSOLUTE' && /sheet|menu/i.test(c.name));
  if (!sheet) continue;
  const przed = Math.round(sheet.height);
  const body = sheet.children.find(c => c.name === 'Body');
  if (body && body.layoutSizingVertical === 'FIXED') body.layoutSizingVertical = 'HUG';
  if (sheet.layoutMode) sheet.layoutSizingVertical = 'HUG';
  if (sheet.height > 820) { sheet.layoutSizingVertical = 'FIXED'; sheet.resize(sheet.width, 820); if (body) body.clipsContent = true; }
  if (/sheet/i.test(sheet.name)) sheet.y = 874 - sheet.height;
  log.push({ screen: f.name, przed, po: Math.round(sheet.height), y: Math.round(sheet.y) });
}
return log;
