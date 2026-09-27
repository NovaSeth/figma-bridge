//# #63: cofnięcie zmiany odstępu w pasku zakładek
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const tb = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Tab bar');
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const V = n => vars.find(v => v.name === n && v.variableCollectionId === cols.find(c => c.name === 'Size').id);
for (const v of tb.children) { v.setBoundVariable('paddingTop', V('spacing/150')); v.setBoundVariable('paddingBottom', V('spacing/100')); v.setBoundVariable('paddingLeft', V('spacing/100')); v.setBoundVariable('paddingRight', V('spacing/100')); }
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const f = page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith('01 '));
await shot(f.children[f.children.length - 1], { name: 'tab-back', scale: 2 });
const v0 = tb.children[0];
return { padding: [v0.paddingTop, v0.paddingRight, v0.paddingBottom, v0.paddingLeft].map(Math.round).join('/'), height: Math.round(v0.height) };
