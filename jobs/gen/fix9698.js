//# opis: #96 przycisk Dzis z DS, #97 licznik, #98 odstep pod tekstem
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const btn = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Button');
const wzor = btn.children.find(c => c.name === 'Style=Secondary, State=Default');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { dzis: [], licznik: [], odstep: [] };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  // 1. "Dziś" to instancja przycisku, nie recznie rysowana ramka
  for (const stary of f.findAll(n => n.type === 'FRAME' && n.name === 'Button' && n.findAll(t => t.type === 'TEXT' && t.characters.trim() === 'Dziś').length)) {
    const rodzic = stary.parent;
    const idx = rodzic.children.indexOf(stary);
    const szer = stary.width, wys = stary.height;
    const inst = wzor.createInstance();
    rodzic.insertChild(idx, inst);
    const kL = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === 'Label');
    if (kL) inst.setProperties({ [kL]: 'Dziś' });
    if (rodzic.layoutMode && rodzic.layoutMode !== 'NONE') { inst.layoutSizingHorizontal = 'HUG'; }
    else { inst.x = stary.x; inst.y = stary.y; }
    inst.layoutSizingVertical = 'FIXED';
    inst.resize(Math.max(inst.width, szer), wys);
    stary.remove();
    log.dzis.push(f.name);
  }
  // 2. licznik przy naglowku sekcji ofert
  for (const d of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Disclosure')) {
    const p = d.componentProperties || {};
    const k = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    if (!k) continue;
    const v = String(p[k].value);
    if (v !== 'Oferta zajęć dodatkowych') continue;
    const blok = d.parent;
    const ile = blok.findAll(n => n.type === 'INSTANCE' && /List row|Feed row/.test(n.name)).length;
    if (!ile) continue;
    d.setProperties({ [k]: 'Oferta zajęć dodatkowych (' + ile + ')' });
    log.licznik.push(f.name + ': ' + ile);
  }
  // 3. akapit pod naglowkiem ma oddech przed karta
  for (const par of f.findAll(n => n.type === 'FRAME' && n.name === 'Paragraph' && 'paddingBottom' in n)) {
    const t = par.findOne(n => n.type === 'TEXT');
    if (!t || !/To ogłoszenia/.test(t.characters)) continue;
    if (par.paddingBottom >= 10) continue;
    par.paddingBottom = 10;
    log.odstep.push(f.name);
  }
}
for (const n of ['17 Plan · miesiąc', '18 Plan · rok']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.6, name: 'vAN-' + n.split(' ')[0] });
}
return log;
