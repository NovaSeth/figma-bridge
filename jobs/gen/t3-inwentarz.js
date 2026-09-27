//# opis: inwentarz przed frekwencja - Day ring, KPI card, Chip, List row + struktura 02f i 02h
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const want = ['Day ring','KPI card','Chip','List row','Icon tile','Cover top bar','Segmented control','Date nav','Section heading','Calendar day'];
const komp = [];
const walk = (n) => {
  if (n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && (!n.parent || n.parent.type !== 'COMPONENT_SET'))) {
    if (want.includes(n.name)) komp.push({
      n: n.name, t: n.type, id: n.id,
      war: n.type === 'COMPONENT_SET' ? n.children.map(c => c.name + ' [' + c.children.map(x=>x.name+':'+x.type).join(',') + ']') : ['(pojedynczy) [' + n.children.map(x=>x.name+':'+x.type).join(',') + ']'],
      props: Object.entries(n.componentPropertyDefinitions || {}).map(([k,v]) =>
        `${k.split('#')[0]}:${v.type}${v.variantOptions ? '=' + v.variantOptions.join('/') : ''}${v.type==='BOOLEAN'?'(dom '+v.defaultValue+')':''}`),
      opis: (n.description || '')
    });
    return;
  }
  if ('children' in n) n.children.forEach(walk);
};
ds.children.forEach(walk);
// struktura 02f i 02h w jasnym
const sek = page.children.find(c => c.type === 'SECTION' && c.name === 'Jasny motyw');
const drzewo = (n, d) => {
  const pre = '  '.repeat(d);
  let s = pre + n.name + ' <' + n.type + '>' + ' ' + Math.round(n.width) + 'x' + Math.round(n.height) + '@' + Math.round(n.x) + ',' + Math.round(n.y);
  if (n.type === 'INSTANCE') s += ' {' + Object.entries(n.componentProperties||{}).map(([k,v])=>k.split('#')[0]+'='+(typeof v.value==='string'?v.value.slice(0,28):v.value)).join('; ') + '}';
  if (n.type === 'TEXT') s += ' "' + n.characters.slice(0,60) + '"';
  if (n.layoutMode && n.layoutMode !== 'NONE') s += ' [' + n.layoutMode + ' gap' + n.itemSpacing + ' pad' + n.paddingTop+'/'+n.paddingRight+'/'+n.paddingBottom+'/'+n.paddingLeft + (n.layoutWrap?' '+n.layoutWrap:'') + ']';
  const out = [s];
  if ('children' in n && d < 7 && n.type !== 'INSTANCE') for (const c of n.children) out.push(...drzewo(c, d+1));
  return out;
};
const f02f = sek.children.find(c => c.name === '02f Teraz · frekwencja');
const f02h = sek.children.find(c => c.name === '02h Frekwencja · szczegóły dnia');
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const light = kol.find(c => c.name === 'Color'), dark = kol.find(c => c.name === 'Color Dark');
const tL = vars.filter(v => v.variableCollectionId === light.id).map(v=>v.name).sort();
const tD = vars.filter(v => v.variableCollectionId === dark.id).map(v=>v.name).sort();
return { komp, tokenyColor: tL, brakWDark: tL.filter(n=>!tD.includes(n)),
  style: (await figma.getLocalTextStylesAsync()).map(s=>s.name).sort(),
  d02f: drzewo(f02f, 0), d02h: drzewo(f02h, 0) };
