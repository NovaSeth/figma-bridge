//# opis: szczegoly Day ring, KPI card, List row Trailing=Value, karta List w arkuszu 02h
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const M = v => (typeof v === 'symbol' ? 'MIXED' : v);
const opis = n => {
  const o = { n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height), x: Math.round(n.x), y: Math.round(n.y) };
  if ('fills' in n && n.fills && n.fills !== figma.mixed) o.fills = n.fills.map(f => f.type + (f.boundVariables && f.boundVariables.color ? ':' + f.boundVariables.color.id : ':' + JSON.stringify(f.color)) + ' o' + (f.opacity===undefined?1:f.opacity) + (f.visible===false?' HIDDEN':''));
  if ('strokes' in n && n.strokes) o.strokes = n.strokes.map(f => f.type + (f.boundVariables && f.boundVariables.color ? ':' + f.boundVariables.color.id : ':' + JSON.stringify(f.color)));
  if ('strokeWeight' in n) o.sw = M(n.strokeWeight);
  if ('strokeAlign' in n) o.sa = n.strokeAlign;
  if ('arcData' in n) { try { o.arc = JSON.parse(JSON.stringify(n.arcData)); } catch(e) { o.arc='?'; } }
  if ('cornerRadius' in n) o.r = M(n.cornerRadius);
  if (n.type === 'TEXT') { o.txt = n.characters; o.styleId = M(n.textStyleId); o.align = n.textAlignHorizontal + '/' + n.textAlignVertical; o.autoResize = n.textAutoResize; }
  if (n.layoutMode) o.lay = n.layoutMode + ' gap' + n.itemSpacing + ' pad' + n.paddingTop+'/'+n.paddingRight+'/'+n.paddingBottom+'/'+n.paddingLeft + ' pa=' + n.primaryAxisAlignItems + ' ca=' + n.counterAxisAlignItems + ' sizH=' + n.layoutSizingHorizontal + ' sizV=' + n.layoutSizingVertical;
  if ('layoutPositioning' in n) o.pos = n.layoutPositioning;
  if ('constraints' in n) o.con = n.constraints.horizontal + '/' + n.constraints.vertical;
  if ('componentPropertyReferences' in n && n.componentPropertyReferences) o.ref = n.componentPropertyReferences;
  if ('children' in n) o.ch = n.children.map(opis);
  return o;
};
const vars = await figma.variables.getLocalVariablesAsync();
const nazwaVar = {}; vars.forEach(v => nazwaVar[v.id] = v.name + '@' + v.variableCollectionId.slice(-6));
const dayring = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Day ring');
const kpi = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'KPI card' && (!n.parent || n.parent.type !== 'COMPONENT_SET'));
const lr = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const lrVal = lr.children.find(c => c.name === 'Leading=None, Trailing=Value');
const lrIcon = lr.children.find(c => c.name === 'Leading=Icon tile, Trailing=None');
const chipSet = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
const chipErr = chipSet.children.find(c => c.name === 'Tone=Error, Size=Default');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const sek = page.children.find(c => c.type === 'SECTION' && c.name === 'Jasny motyw');
const f02h = sek.children.find(c => c.name === '02h Frekwencja · szczegóły dnia');
const sheet = f02h.children.find(c => c.name === 'Bottom sheet');
return { nazwaVar, dayring: opis(dayring), kpi: opis(kpi), lrVal: opis(lrVal), lrIcon: opis(lrIcon), chipErr: opis(chipErr), sheet: opis(sheet),
  kpiProps: Object.keys(kpi.componentPropertyDefinitions), dsSekcje: ds.children.filter(c=>c.type==='SECTION').map(s=>({n:s.name, board: (s.children.find(c=>c.name==='Board')||{children:[]}).children.map(c=>c.name+' @'+Math.round(c.x)+','+Math.round(c.y)+' '+Math.round(c.width)+'x'+Math.round(c.height))})) };
