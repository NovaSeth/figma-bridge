//# opis: FAB nad paskiem zakladek na kazdym ekranie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const log = [];
for (const sec of page.children.filter(s => s.type === 'SECTION')) for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const fab = f.children.find(c => c.name === 'FAB');
  if (!fab) continue;
  const tabs = f.children.find(c => c.name === 'Tab bar');
  const dol = tabs ? f.height - tabs.height : f.height;
  const przed = Math.round(fab.y);
  fab.y = dol - 16 - fab.height;
  fab.x = f.width - 16 - fab.width;
  log.push({ screen: f.name, przed, po: Math.round(fab.y), dolZakladek: Math.round(dol), frameH: Math.round(f.height) });
}
return log;
