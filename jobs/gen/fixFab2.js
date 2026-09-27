//# opis: dlugie ekrany rosna o zapas pod FAB
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const fab = f.children.find(c => c.name === 'FAB');
  if (!fab || f.height <= 874) continue;
  const main = f.children.find(c => c.name === 'Main Content');
  const tabs = f.children.find(c => c.name === 'Tab bar');
  const przed = Math.round(f.height);
  if (main) { main.layoutGrow = 0; main.layoutSizingVertical = 'HUG'; }
  f.primaryAxisSizingMode = 'AUTO';
  const dol = tabs ? f.height - tabs.height : f.height;
  fab.y = dol - 16 - fab.height;
  fab.x = f.width - 16 - fab.width;
  log.push({ screen: f.name, przed, po: Math.round(f.height), fabY: Math.round(fab.y) });
  await shot(f, { scale: 0.6, name: 'vB-' + f.name.split(' ')[0] });
}
return log;
