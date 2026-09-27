//# opis: chipy w kalendarzach na instancje DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar chip');
const W = {}; for (const c of set.children) W[c.name.split('=')[1]] = c;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const ton = (txt) => /zad\./.test(txt) ? 'Zadania' : /^\d{1,2}:\d{2}/.test(txt) ? 'Lekcje' : /koniki|własne/i.test(txt) ? 'Własne' : 'Szkoła';
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const kandydaci = f.findAll(n => n.type === 'FRAME' && n.height > 10 && n.height < 20 && n.children.length === 1 && n.children[0].type === 'TEXT'
    && n.fills && n.fills !== figma.mixed && n.fills.some(x => x.type === 'SOLID' && x.visible !== false) && n.cornerRadius === 4);
  for (const n of kandydaci) {
    const t = n.children[0];
    const etykieta = t.characters;
    const inst = W[ton(etykieta)].createInstance();
    const rodzic = n.parent;
    const idx = rodzic.children.indexOf(n);
    const szer = n.width;
    rodzic.insertChild(idx, inst);
    if (rodzic.layoutMode) { inst.layoutSizingHorizontal = 'FILL'; } else { inst.resize(szer, inst.height); inst.x = n.x; inst.y = n.y; }
    const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === 'Label');
    if (k) inst.setProperties({ [k]: etykieta });
    n.remove();
    log.push(f.name + ' / ' + etykieta);
  }
}
for (const n of ['15 Plan · dzień','16 Plan · tydzień','17 Plan · miesiąc']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.6, name: 'vV-' + n.split(' ')[0] });
}
return { n: log.length, probka: log.slice(0, 8) };
