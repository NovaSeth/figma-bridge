//# opis: #105 zaokraglenie i oddech siatki miesiaca
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const log = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    const grid = f.findOne(n => n.type === 'FRAME' && n.name === 'MonthGrid');
    if (!grid) continue;
    const przed = { r: grid.cornerRadius, pad: [grid.paddingTop, grid.paddingRight, grid.paddingBottom, grid.paddingLeft] };
    grid.cornerRadius = 20;
    grid.clipsContent = true;
    grid.paddingTop = 10; grid.paddingBottom = 10;
    grid.paddingLeft = 8; grid.paddingRight = 8;
    log.push({ sekcja: sek.name, screen: f.name, przed, po: { r: 20, pad: [10, 8, 10, 8] } });
  }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '17 Plan · miesiąc');
await shot(f, { scale: 0.7, name: 'vE9-17' });
const sekD = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
const fd = sekD.children.find(x => x.name === '17 Plan · miesiąc');
await shot(fd, { scale: 0.7, name: 'vE9-d17' });
return log;
