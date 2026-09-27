//# Diagnostyka paska zakładek i karty akcji
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const f = page.children.flatMap(s => s.type === 'SECTION' ? s.children : []).find(n => n.name.startsWith('01 '));
const nav = f.children[f.children.length - 1];
const line = (n, d) => '  '.repeat(d) + n.type[0] + " '" + n.name.slice(0, 22) + "' " + Math.round(n.width) + 'x' + Math.round(n.height) + (n.type === 'TEXT' ? ' «' + n.characters.slice(0, 14) + '» ' + (n.textStyleId ? 'S' : '-') + ' ' + n.fontSize : '') + (n.layoutPositioning === 'ABSOLUTE' ? ' ABS' : '') + (n.visible === false ? ' HIDDEN' : '') + (n.layoutMode && n.layoutMode !== 'NONE' ? ' ' + n.layoutMode[0] + ' g' + Math.round(n.itemSpacing) : '') + (n.clipsContent ? ' clip' : '');
const out = []; const walk = (n, d, max) => { out.push(line(n, d)); if ('children' in n && d < max) n.children.forEach(c => walk(c, d + 1, max)); };
out.push('== NAV'); walk(nav, 0, 4);
const card = f.children[1].findOne(n => n.type === 'FRAME' && n.cornerRadius === 20 && n.findAllWithCriteria({ types: ['TEXT'] }).some(t => t.characters === 'Odpowiedz'));
out.push('== CARD'); walk(card, 0, 3);
await shot(nav, { name: 'd-nav', scale: 2 });
return out.join('\n');
