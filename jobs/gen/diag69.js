//# Diagnostyka: gdzie wylądowały nowe listy
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const f = page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith('01 '));
const main = f.children.find(c => c.name === 'Main Content');
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const dump = (n, d) => { const pad = '  '.repeat(d); const s = pad + n.type[0] + " '" + n.name.slice(0, 20) + "' " + Math.round(n.width) + 'x' + Math.round(n.height) + (n.layoutMode ? ' ' + n.layoutMode[0] : '') + ' sV=' + (n.layoutSizingVertical || '-') + ' kids=' + (n.children ? n.children.length : 0); return s; };
const out = [];
for (const sec of main.children.slice(0, 4)) { out.push(dump(sec, 0));
  for (const c of (sec.children || [])) { out.push(dump(c, 1)); for (const g of (c.children || []).slice(0, 4)) out.push(dump(g, 2) + (T(g)[0] ? ' «' + T(g)[0].characters.slice(0, 20) + '»' : '')); } }
return out.join('\n');
