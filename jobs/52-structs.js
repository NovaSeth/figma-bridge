// Odczyt struktur: wiersze, chipy, listy, pasek kalendarza, komórka miesiąca
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const line = (n, d) => { let s = '  '.repeat(d) + n.id + ' ' + n.type[0] + " '" + n.name.slice(0, 18) + "' " + Math.round(n.width) + 'x' + Math.round(n.height);
  if ('layoutMode' in n && n.layoutMode !== 'NONE') s += ' ' + n.layoutMode[0] + ' g' + Math.round(n.itemSpacing) + ' p' + [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(Math.round).join('/') + ' ' + n.primaryAxisAlignItems[0] + n.counterAxisAlignItems[0];
  if ('layoutSizingHorizontal' in n) s += ' s' + n.layoutSizingHorizontal[1] + n.layoutSizingVertical[1];
  if (n.layoutPositioning === 'ABSOLUTE') s += ' ABS@' + Math.round(n.x) + ',' + Math.round(n.y);
  if (n.type === 'TEXT') s += ' «' + n.characters.slice(0, 22) + '» ' + n.fontName.style + ' ' + n.fontSize;
  if ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius) s += ' r' + n.cornerRadius;
  if ('fills' in n && Array.isArray(n.fills) && n.fills[0] && n.fills[0].type === 'SOLID') { const c = n.fills[0].color; s += ' #' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); }
  return s; };
const out = []; const walk = (n, d, max) => { out.push(line(n, d)); if ('children' in n && d < max) n.children.forEach(c => walk(c, d + 1, max)); };
const anc = (n, k) => { for (let i = 0; i < k; i++) n = n.parent; return n; };
const T = async id => figma.getNodeByIdAsync(id);
out.push('--- P3 row (Logopedia)'); walk(anc(await T('3:266'), 5), 0, 6);
out.push('--- notice row'); walk(anc(await T('47:4'), 2), 0, 3);
out.push('--- zadania chip row (overdue) + chip'); const z = await T('7:2'); const od = z.findAllWithCriteria({ types: ['TEXT'] }).find(t => t.characters.includes('17 wrz')); walk(anc(od, 2), 0, 3);
out.push('--- completed details (05)'); const f5 = await T('8:2'); walk(f5.children[1].children[f5.children[1].children.length - 2], 0, 5);
out.push('--- msg row (07)'); walk(anc(await T('10:58'), 5), 0, 2);
out.push('--- segmented (07)'); walk(anc(await T('10:35'), 1), 0, 2);
out.push('--- cal bar (15)'); walk(anc(await T('18:36'), 1), 0, 2);
out.push('--- month cell 18 + a plain weekday cell'); const c18 = anc(await T('20:178'), 2); walk(c18, 0, 3); const grid = c18.parent; out.push('grid: ' + line(grid, 0) + ' kids=' + grid.children.length); walk(grid.children[9], 0, 2);
return out.join('\n');
