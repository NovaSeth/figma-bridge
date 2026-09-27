//# opis: #92 cofniecie blednej podmiany na Calendar day
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[n]);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const inst of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Calendar day')) {
    const k = Object.keys(inst.componentProperties || {}).find(x => x.split('#')[0] === 'Day');
    const v = k ? String(inst.componentProperties[k].value) : '';
    if (/^\d{1,2}$/.test(v.trim())) continue; // prawdziwy dzien zostaje
    const rodzic = inst.parent;
    const idx = rodzic.children.indexOf(inst);
    const t = figma.createText();
    t.characters = v;
    t.name = v.slice(0, 30);
    if (S['title/sm']) await t.setTextStyleIdAsync(S['title/sm'].id);
    t.fills = [paint('color/on-surface', { r: 0.07, g: 0.07, b: 0.07 })];
    t.textAutoResize = 'HEIGHT';
    rodzic.insertChild(idx, t);
    if (rodzic.layoutMode && rodzic.layoutMode !== 'NONE') t.layoutSizingHorizontal = 'FILL';
    else { t.x = inst.x; t.y = inst.y; t.resize(inst.width, t.height); }
    inst.remove();
    log.push({ screen: f.name, przywrocony: v });
    await shot(f, { scale: 0.7, name: 'vAI-' + f.name.split(' ')[0] });
  }
}
return log;
