// Odczyt: budowa wierszy „cały dzień" w Planie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const line = (n, d) => { let s = '  '.repeat(d) + n.id + ' ' + n.type[0] + " '" + n.name.slice(0, 16) + "' " + Math.round(n.width) + 'x' + Math.round(n.height) + ' @' + Math.round(n.x) + ',' + Math.round(n.y);
  if ('layoutMode' in n) s += ' ' + n.layoutMode[0] + (n.layoutMode !== 'NONE' ? ' g' + Math.round(n.itemSpacing) + ' p' + [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(Math.round).join('/') : '');
  if (n.layoutPositioning === 'ABSOLUTE') s += ' ABS';
  if (n.type === 'TEXT') s += ' «' + n.characters.slice(0, 18) + '» ' + n.fontSize; return s; };
const out = []; const walk = (n, d, max) => { out.push(line(n, d)); if ('children' in n && d < max) n.children.forEach(c => walk(c, d + 1, max)); };
for (const id of ['18:2', '19:2']) { const f = await figma.getNodeByIdAsync(id); const items = f.findAll(n => n.name === 'List Item'); out.push('== ' + f.name + ' items=' + items.length); walk(items[0].parent, 0, 4); }
return out.join('\n');
