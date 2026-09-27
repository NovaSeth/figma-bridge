//# opis: stan Icon tile po probie
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
const fab = ds.findOne(n => n.name === 'FAB' && (n.type==='COMPONENT'||n.type==='COMPONENT_SET'));
const ti = ds.findOne(n => n.name === 'Tab item' && (n.type==='COMPONENT'||n.type==='COMPONENT_SET'));
return { warianty: set.children.map(c=>c.name), props: Object.keys(set.componentPropertyDefinitions), opis: set.description.slice(0,120), fabOpis: fab.description.slice(0,200), tiOpis: ti.description.slice(0,200) };
