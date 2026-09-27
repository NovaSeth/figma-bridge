//# opis: Calendar chip i Legend item wracaja do Chip
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const chip = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
const W = {}; for (const c of chip.children) W[c.name] = c;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const TON_KAL = { 'Lekcje': 'Info', 'Zadania': 'Warning', 'Szkoła': 'Neutral', 'Własne': 'Success' };
const TON_LEG = { 'Success': 'Success', 'Error': 'Error', 'Warning': 'Warning' };
const log = { kalendarz: 0, legenda: 0 };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const inst of f.findAll(n => n.type === 'INSTANCE')) {
    const glowny = await inst.getMainComponentAsync();
    if (!glowny || !glowny.parent) continue;
    const zestaw = glowny.parent.type === 'COMPONENT_SET' ? glowny.parent.name : glowny.name;
    let cel = null, rozmiar = null;
    if (zestaw === 'Calendar chip') { cel = TON_KAL[glowny.name.split('=')[1]]; rozmiar = 'Compact'; }
    else if (zestaw === 'Legend item') { cel = TON_LEG[glowny.name.split('=')[1]]; rozmiar = 'Default'; }
    if (!cel) continue;
    const etykieta = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === 'Label');
    const tekst = etykieta ? String(inst.componentProperties[etykieta].value) : '';
    const wzor = W['Tone=' + cel + ', Size=' + rozmiar];
    if (!wzor) continue;
    const nowy = wzor.createInstance();
    const rodzic = inst.parent;
    const idx = rodzic.children.indexOf(inst);
    const szer = inst.width;
    rodzic.insertChild(idx, nowy);
    if (rodzic.layoutMode) { if (rozmiar === 'Compact') nowy.layoutSizingHorizontal = 'FILL'; }
    else { nowy.x = inst.x; nowy.y = inst.y; nowy.resize(szer, nowy.height); }
    const p = nowy.componentProperties || {};
    const set = {};
    const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    const kI = Object.keys(p).find(x => x.split('#')[0] === 'Show icon');
    if (kL) set[kL] = tekst;
    if (kI) set[kI] = false;
    if (Object.keys(set).length) nowy.setProperties(set);
    inst.remove();
    if (rozmiar === 'Compact') log.kalendarz++; else log.legenda++;
  }
}
return log;
