// Podgląd miejsca komentarza #21
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('8:2');
const main = f.children[1];
const tail = main.children.slice(-3);
for (const [i, n] of tail.entries()) await shot(n, { name: 'c21-' + i, scale: 1 });
return tail.map(n => n.name + ' ' + Math.round(n.width) + 'x' + Math.round(n.height) + ' y' + Math.round(n.y));
