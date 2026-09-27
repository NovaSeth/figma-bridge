//# opis: dlaczego przyciski nachodza na pole Tresc
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = light.children.find(x => x.name === '13 Nowa wiadomość');
const cont = await figma.getNodeByIdAsync('16:68');
const chain = [];
let n = cont;
while (n && n !== f) { chain.unshift({ n: n.name, t: n.type, y: Math.round(n.y), h: Math.round(n.height), layout: n.layoutMode || null, sizV: 'layoutSizingVertical' in n ? n.layoutSizingVertical : null, abs: n.layoutPositioning, mt: n.itemSpacing }); n = n.parent; }
const parent = cont.parent;
const sib = parent.children.map(c => ({ n: c.name, t: c.type, y: Math.round(c.y), h: Math.round(c.height), sizV: 'layoutSizingVertical' in c ? c.layoutSizingVertical : null, abs: c.layoutPositioning }));
return { chain, parentName: parent.name, parentLayout: parent.layoutMode, parentGap: parent.itemSpacing, parentH: Math.round(parent.height), sib };
