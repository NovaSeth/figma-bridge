//# opis: pelnoekranowy popup przykrywa naglowek i zakladki
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const log = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    const main = f.children.find(c => c.name === 'Main Content');
    if (!main) continue;
    if (!main.findOne(n => n.type === 'INSTANCE' && n.name === 'Cover top bar')) continue;
    const usuniete = [];
    for (const c of f.children.slice()) {
      if (c.name === 'App header' || c.name === 'Tab bar') { usuniete.push(c.name); c.remove(); }
    }
    if (!usuniete.length) continue;
    main.layoutSizingVertical = 'FILL';
    main.layoutGrow = 1;
    main.paddingTop = Math.max(main.paddingTop || 0, 8);
    log.push({ sekcja: sek.name, screen: f.name, usuniete });
  }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const n of ['08 Wiadomość · wątek', '13 Nowa wiadomość']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.7, name: 'vE4-' + n.split(' ')[0] });
}
return log;
