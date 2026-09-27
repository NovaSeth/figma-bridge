//# opis: jednakowy rytm naglowkow sekcji
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { rodzice: 0, marginesy: 0, probka: [] };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  // 1. nagłówek sekcji zawsze 10 px nad swoją kartą
  for (const h of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Section heading')) {
    const rodzic = h.parent;
    if (!rodzic || rodzic.layoutMode !== 'VERTICAL') continue;
    if (rodzic.itemSpacing !== 10) {
      log.probka.push(f.name + ' / ' + rodzic.name + ': ' + rodzic.itemSpacing + '→10');
      rodzic.itemSpacing = 10;
      log.rodzice++;
    }
  }
  // 2. 24 px między blokami sekcji
  const main = f.children.find(c => c.name === 'Main Content');
  if (!main) continue;
  const bloki = main.children.filter(c => /:margin$/.test(c.name));
  for (let i = 0; i < bloki.length; i++) {
    const b = bloki[i];
    if (!('paddingTop' in b)) continue;
    const ma = b.findOne && b.findOne(n => n.type === 'INSTANCE' && n.name === 'Section heading');
    if (!ma) continue;
    const cel = i === 0 ? 8 : 24;
    if (b.paddingTop !== cel) { b.paddingTop = cel; log.marginesy++; }
  }
}
log.probka = log.probka.slice(0, 10);
return log;
