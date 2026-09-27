//# opis: inwentarz przed budowa ekranow 26, 25, 06a, 06b
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const sekcje = page.children.filter(c => c.type === 'SECTION').map(s => ({
  nazwa: s.name,
  ramki: s.children.filter(c => c.type === 'FRAME').sort((a,b)=>a.y-b.y||a.x-b.x)
    .map(c => `${c.name} @${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.width)}x${Math.round(c.height)}`)
}));
const want = ['Chip','Button','Banner','Icon tile','List row','Section heading','Disclosure','Quote',
  'Message card','Segmented control','Tab bar','Tab item','App header','Empty state','FAB','Feed row',
  'Summary card','Progress bar','Card','Avatar','KPI card','Date nav','Calendar event','Day ring'];
const komp = [];
const walk = (n) => {
  if (n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && (!n.parent || n.parent.type !== 'COMPONENT_SET'))) {
    if (want.includes(n.name)) komp.push({
      n: n.name, t: n.type,
      war: n.type === 'COMPONENT_SET' ? n.children.map(c => c.name) : ['(pojedynczy)'],
      props: Object.entries(n.componentPropertyDefinitions || {}).map(([k,v]) =>
        `${k.split('#')[0]}:${v.type}${v.variantOptions ? '=' + v.variantOptions.join('/') : ''}${v.type==='BOOLEAN'?'(dom '+v.defaultValue+')':''}`),
      opis: (n.description || '').slice(0, 400)
    });
    return;
  }
  if ('children' in n) n.children.forEach(walk);
};
ds.children.forEach(walk);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const kolekcje = kol.map(c => ({ nazwa: c.name, tryby: c.modes.map(m=>m.name), ile: vars.filter(v=>v.variableCollectionId===c.id).length }));
const light = kol.find(c => c.name === 'Color');
const tokenyColor = vars.filter(v => v.variableCollectionId === light.id).map(v=>v.name).sort();
const dark = kol.find(c => c.name === 'Color Dark');
const tokenyDark = vars.filter(v => v.variableCollectionId === dark.id).map(v=>v.name).sort();
const style = (await figma.getLocalTextStylesAsync()).map(s=>s.name).sort();
// sekcje strony DS + zawartosc Board
const dsSekcje = ds.children.filter(c=>c.type==='SECTION').map(s => ({
  nazwa: s.name,
  dzieci: s.children.map(c=>`${c.name} (${c.type})`),
  board: (s.children.find(c=>c.name==='Board') ? s.children.find(c=>c.name==='Board').children.map(c=>`${c.name} (${c.type}) @${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.width)}x${Math.round(c.height)}`) : null)
}));
return { sekcje, komp, kolekcje, tokenyColor, brakWDark: tokenyColor.filter(n=>!tokenyDark.includes(n)), style, dsSekcje };
