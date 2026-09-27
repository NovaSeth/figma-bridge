//# opis: kontener arkusza opisany tokenami + wpis w DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const cSize = kol.find(c => c.name === 'Size');
const V = {}; const VS = {};
for (const v of await figma.variables.getLocalVariablesAsync()) {
  if (v.variableCollectionId === cLight.id) V[v.name] = v;
  if (cSize && v.variableCollectionId === cSize.id) VS[v.name] = v;
}
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb || { r: 1, g: 1, b: 1 } }, 'color', V[n]);
// styl cienia arkusza
let styl = (await figma.getLocalEffectStylesAsync()).find(s => s.name === 'elevation/sheet');
if (!styl) {
  styl = figma.createEffectStyle();
  styl.name = 'elevation/sheet';
  styl.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.16 }, offset: { x: 0, y: -2 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }];
  styl.description = 'Cień arkusza dolnego i menu wysuwanego znad treści.';
}
const promien = Object.keys(VS).filter(n => /radius/.test(n));
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const sh of f.children.filter(c => /Bottom sheet|Child menu/.test(c.name))) {
    sh.fills = [paint('color/surface')];
    await sh.setEffectStyleIdAsync(styl.id);
    sh.topLeftRadius = 28; sh.topRightRadius = 28;
    if (/Child menu/.test(sh.name)) { sh.bottomLeftRadius = 28; sh.bottomRightRadius = 28; }
    else { sh.bottomLeftRadius = 0; sh.bottomRightRadius = 0; }
    log.push(f.name + ' / ' + sh.name);
  }
}
return { styl: styl.name, promienie: promien, ujednolicone: log.length };
