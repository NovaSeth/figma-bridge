//# opis: stan faktyczny DS - osie wariantow i opisy komponentow kluczowych dla nowych ekranow
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const want = ['Chip','Button','Banner','Icon tile','Day ring','Calendar day','Calendar event',
              'KPI card','List row','Empty state','FAB','Tab item','Tab bar','Segmented control','Text field'];
const out = [];
const walk = (n) => {
  if (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') {
    if (want.includes(n.name)) {
      out.push({
        name: n.name, type: n.type,
        variants: n.type === 'COMPONENT_SET' ? n.children.map(c => c.name) : ['(pojedynczy)'],
        props: Object.entries(n.componentPropertyDefinitions || {}).map(([k, v]) =>
          `${k.split('#')[0]}:${v.type}${v.variantOptions ? '=' + v.variantOptions.join('/') : ''}`),
        desc: (n.description || '').slice(0, 220),
      });
    }
    return;
  }
  if ('children' in n) n.children.forEach(walk);
};
ds.children.forEach(walk);
// Tokeny kolorow: czy sa error-container / on-error-container
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const nazwy = vars.filter(v => /error|warning|info|primary-container/i.test(v.name)).map(v => {
  const c = kol.find(k => k.id === v.variableCollectionId);
  return `${c ? c.name : '?'} / ${v.name}`;
});
return { komponenty: out, tokenyKolorow: [...new Set(nazwy)].sort() };
