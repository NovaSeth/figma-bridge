//# opis: test override arcData na instancji, ekspozycja zagniezdzonych instancji, wartosci tokenow, struktura Doc i arkusza 02h
const M = v => (typeof v === 'symbol' ? 'MIXED' : v);
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const log = {};
// --- 1. test arcData jako override ---
const dr = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Day ring');
const part = dr.children.find(c => c.name === 'State=Partial');
const test = part.createInstance();
figma.currentPage.appendChild(test);
try {
  const arc = test.findOne(n => n.name === 'Arc');
  arc.arcData = { startingAngle: -Math.PI/2, endingAngle: -Math.PI/2 + 2*Math.PI*0.625, innerRadius: 0.72 };
  log.arcOverride = 'OK ' + JSON.stringify(arc.arcData);
  const arc2 = test.findOne(n => n.name === 'Arc');
  arc2.arcData = { startingAngle: -Math.PI/2, endingAngle: -Math.PI/2, innerRadius: 0.72 };
  log.arcZero = 'OK zero: ' + JSON.stringify(arc2.arcData);
} catch (e) { log.arcOverride = 'PAD: ' + e.message; }
// --- 2. zagniezdzone instancje w List row: czy exposed ---
const lr = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const wariant = lr.children.find(c => c.name === 'Leading=Icon tile, Trailing=None');
log.listRowNested = wariant.findAll(n => n.type === 'INSTANCE').map(n => n.name + ' exposed=' + n.isExposedInstance + ' ref=' + JSON.stringify(n.componentPropertyReferences));
const inst = wariant.createInstance();
figma.currentPage.appendChild(inst);
try {
  const c1 = inst.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip top 1');
  if (c1) { const k = Object.keys(c1.componentProperties).find(x => x.split('#')[0] === 'Label'); c1.setProperties({ [k]: 'TEST' }); log.nestedSet = 'OK'; }
  else log.nestedSet = 'brak Chip top 1';
} catch (e) { log.nestedSet = 'PAD: ' + e.message; }
log.instExposed = inst.exposedInstances ? inst.exposedInstances.map(n => n.name) : null;
test.remove(); inst.remove();
// --- 3. tokeny: rozwiniete wartosci w obu kolekcjach ---
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = {}; vars.forEach(v => byId[v.id] = v);
const kolById = {}; kol.forEach(c => kolById[c.id] = c);
const rozwin = v => { let w = v.valuesByMode[kolById[v.variableCollectionId].modes[0].modeId]; let i = 0;
  while (w && w.type === 'VARIABLE_ALIAS' && i++ < 8) { const n = byId[w.id]; if (!n) return null; w = n.valuesByMode[kolById[n.variableCollectionId].modes[0].modeId]; } return w; };
const hex = c => c ? '#' + [c.r,c.g,c.b].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('') : '?';
const CHCE = ['color/error','color/error-container','color/on-error-container','color/warning','color/warning-strong','color/warning-container','color/success','color/success-container','color/surface','color/background','color/outline','color/outline-variant','color/on-surface','color/on-surface-variant','color/primary'];
log.tokeny = {};
for (const nm of CHCE) {
  const l = vars.find(v => v.name === nm && kolById[v.variableCollectionId].name === 'Color');
  const d = vars.find(v => v.name === nm && kolById[v.variableCollectionId].name === 'Color Dark');
  log.tokeny[nm] = { jasny: hex(rozwin(l)), ciemny: hex(rozwin(d)) };
}
// --- 4. Doc na tablicy: struktura Day ring i KPI card ---
const drzewo = (n, d) => { const out = [ '  '.repeat(d) + n.name + ' <' + n.type + '> ' + Math.round(n.width) + 'x' + Math.round(n.height) + '@' + Math.round(n.x) + ',' + Math.round(n.y) + (n.type==='TEXT' ? ' "' + n.characters.slice(0,70) + '"' : '') + (n.type==='INSTANCE' ? ' {'+Object.entries(n.componentProperties||{}).map(([k,v])=>k.split('#')[0]+'='+v.value).join(';')+'}' : '') + (n.layoutMode && n.layoutMode!=='NONE' ? ' ['+n.layoutMode+' gap'+n.itemSpacing+']' : '') ];
  if ('children' in n && d < 4) for (const c of n.children) out.push(...drzewo(c, d+1)); return out; };
for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
  const b = sek.children.find(c => c.name === 'Board'); if (!b) continue;
  for (const nm of ['Doc · Day ring','Doc · KPI card','Doc · Chip','Doc · List row']) {
    const doc = b.children.find(c => c.name === nm);
    if (doc) log[nm] = drzewo(doc, 0);
  }
}
// --- 5. arkusz 02h: fills kart ---
const sek = page.children.find(c => c.type === 'SECTION' && c.name === 'Jasny motyw');
const f02h = sek.children.find(c => c.name === '02h Frekwencja · szczegóły dnia');
const sheet = f02h.children.find(c => c.name === 'Bottom sheet');
const opisPelny = n => { const o = { n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height) };
  if ('fills' in n && n.fills !== figma.mixed && n.fills) o.f = n.fills.map(f => (f.boundVariables&&f.boundVariables.color) ? byId[f.boundVariables.color.id].name : JSON.stringify(f.color));
  if ('strokes' in n && n.strokes) o.s = n.strokes.map(f => (f.boundVariables&&f.boundVariables.color) ? byId[f.boundVariables.color.id].name : JSON.stringify(f.color));
  if ('strokeWeight' in n) o.sw = M(n.strokeWeight); if ('strokeAlign' in n) o.sa = n.strokeAlign;
  if ('cornerRadius' in n) o.r = M(n.cornerRadius);
  if (n.type === 'TEXT') { o.txt = n.characters; o.st = M(n.textStyleId); }
  if (n.layoutMode) o.lay = n.layoutMode + ' gap' + n.itemSpacing + ' pad' + n.paddingTop+'/'+n.paddingRight+'/'+n.paddingBottom+'/'+n.paddingLeft + ' sizH=' + n.layoutSizingHorizontal + ' sizV=' + n.layoutSizingVertical + ' ca=' + n.counterAxisAlignItems;
  if ('children' in n) o.ch = n.children.map(opisPelny); return o; };
log.arkusz02h = opisPelny(sheet);
log.style = {}; (await figma.getLocalTextStylesAsync()).forEach(s => log.style[s.id] = s.name);
return log;
