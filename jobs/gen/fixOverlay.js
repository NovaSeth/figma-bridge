//# opis: ekrany z arkuszem zawsze 874 px
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const H = 874;
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const scrim = f.children.find(c => c.name === 'Scrim');
  if (!scrim) continue;
  const przed = Math.round(f.height);
  const main = f.children.find(c => c.name === 'Main Content');
  const tabs = f.children.find(c => c.name === 'Tab bar');
  const fab = f.children.find(c => c.name === 'FAB');
  const nakladki = f.children.filter(c => c.layoutPositioning === 'ABSOLUTE' && c !== scrim);
  // ramka na wysokość urządzenia
  f.primaryAxisSizingMode = 'FIXED';
  f.resize(402, H);
  f.clipsContent = true;
  if (main) { main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1; main.paddingBottom = 0; }
  scrim.x = 0; scrim.y = 0; scrim.resize(402, H);
  if (fab) { const dol = tabs ? H - tabs.height : H; fab.y = dol - 16 - fab.height; fab.x = 402 - 16 - fab.width; }
  for (const o of nakladki) {
    if (o === fab) continue;
    if (/sheet/i.test(o.name)) { if (o.height > H - 40) { o.layoutSizingVertical = 'FIXED'; o.resize(o.width, H - 54); } o.y = H - o.height; }
    else if (o.y + o.height > H) o.y = Math.max(0, H - o.height);
  }
  log.push({ screen: f.name, przed, po: Math.round(f.height), arkusz: nakladki.filter(o => o !== fab).map(o => o.name + '@' + Math.round(o.y) + 'h' + Math.round(o.height)) });
}
return log;
