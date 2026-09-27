//# opis: tresc nie chowa sie pod zakladkami na dlugich ekranach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  if (f.children.find(c => c.name === 'Scrim')) continue; // ekrany z arkuszem zostaja na 874
  const main = f.children.find(c => c.name === 'Main Content');
  const tabs = f.children.find(c => c.name === 'Tab bar');
  if (!main || !tabs) continue;
  const ostatni = main.children[main.children.length - 1];
  if (!ostatni) continue;
  const zapas = tabs.y - (main.y + ostatni.y + ostatni.height);
  if (zapas >= 8) continue;
  const przed = Math.round(f.height);
  main.layoutGrow = 0;
  main.layoutSizingVertical = 'HUG';
  f.primaryAxisSizingMode = 'AUTO';
  const fab = f.children.find(c => c.name === 'FAB');
  if (fab) { fab.y = f.height - tabs.height - 16 - fab.height; fab.x = f.width - 16 - fab.width; }
  log.push({ screen: f.name, przed, po: Math.round(f.height), zapas: Math.round(tabs.y - (main.y + main.height)) });
  await shot(f, { scale: 0.45, name: 'vAE-' + f.name.split(' ')[0] });
}
return log;
