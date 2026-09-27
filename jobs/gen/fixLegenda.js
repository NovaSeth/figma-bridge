//# opis: legenda frekwencji - wlasciwe etykiety i tony
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const chip = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
const W = {}; for (const c of chip.children) W[c.name] = c;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const POZYCJE = [['Success', 'Obecność'], ['Error', 'Nieobecność'], ['Warning', 'Spóźnienie']];
const log = [];
for (const nazwa of ['02f Teraz · frekwencja', '02h Frekwencja · szczegóły dnia']) {
  const f = sec.children.find(x => x.name === nazwa);
  if (!f) continue;
  const legenda = f.findOne(n => n.type === 'FRAME' && n.name === 'Legenda');
  if (!legenda) continue;
  for (const c of legenda.children.slice()) c.remove();
  for (const [ton, etykieta] of POZYCJE) {
    const inst = W['Tone=' + ton + ', Size=Default'].createInstance();
    legenda.appendChild(inst);
    inst.layoutSizingHorizontal = 'HUG';
    const p = inst.componentProperties || {};
    const set = {};
    const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    const kI = Object.keys(p).find(x => x.split('#')[0] === 'Show icon');
    if (kL) set[kL] = etykieta;
    if (kI) set[kI] = false;
    inst.setProperties(set);
    log.push(nazwa + ' / ' + etykieta + ' (' + ton + ')');
  }
  legenda.itemSpacing = 8;
  await shot(f, { scale: 0.7, name: 'vKon-' + nazwa.split(' ')[0] });
}
return log;
