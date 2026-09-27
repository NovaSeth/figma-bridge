//# #61 sprzątanie zdublowanych elementów, #62 większy odstęp aktywnej zakładki
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await page.loadAsync();
const out = { dsLoose: ds.children.filter(n => n.type !== 'SECTION').map(n => n.type + ' ' + n.name.slice(0, 40) + ' @' + Math.round(n.x) + ',' + Math.round(n.y)) };
out.mockupsLoose = page.children.filter(n => n.type !== 'SECTION').length;
// #61: karta reguły dubluje opis komponentu Chip i stronę Start → usuwam; notkę o źródle makiet też
let removedDs = [];
for (const n of ds.children.filter(x => x.type !== 'SECTION')) { removedDs.push(n.name.slice(0, 40)); n.remove(); }
// śmieci po migracji: instancje leżące luzem na stronie makiet
let removedMock = 0;
for (const n of page.children.filter(x => x.type !== 'SECTION')) { n.remove(); removedMock++; }
// #62: aktywna zakładka z większym oddechem od krawędzi paska
const tb = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Tab bar');
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const V = n => vars.find(v => v.name === n && v.variableCollectionId === cols.find(c => c.name === 'Size').id);
for (const v of tb.children) { v.setBoundVariable('paddingTop', V('spacing/250')); v.setBoundVariable('paddingBottom', V('spacing/150')); v.setBoundVariable('paddingLeft', V('spacing/150')); v.setBoundVariable('paddingRight', V('spacing/150')); }
out.tabbar = { padding: tb.children[0].padding = [tb.children[0].paddingTop, tb.children[0].paddingRight, tb.children[0].paddingBottom, tb.children[0].paddingLeft].map(Math.round).join('/'), h: Math.round(tb.children[0].height) };
await figma.setCurrentPageAsync(page);
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
const f = get('01 '); await shot(f.children[f.children.length - 1], { name: 'tab-after', scale: 2 });
return { ...out, removedDs, removedMock };
