//# opis: przywrocenie szerokosci 02f
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const log = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const f of sek.children) {
    if (f.type !== 'FRAME' || Math.round(f.width) === 402) continue;
    const main = f.children.find(c => c.name === 'Main Content');
    log.push({ sekcja: sek.name, screen: f.name, przed: Math.round(f.width),
      mainSizH: main ? main.layoutSizingHorizontal : null, counterAxis: f.counterAxisSizingMode, primary: f.primaryAxisSizingMode });
    f.counterAxisSizingMode = 'FIXED';
    f.resize(402, f.height);
    if (main) { main.layoutSizingHorizontal = 'FILL'; }
    log[log.length - 1].po = Math.round(f.width);
  }
}
return log;
