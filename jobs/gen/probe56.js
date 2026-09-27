//# Kontekst komentarzy #50–#56
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'Jasny motyw');
const at = (x, y) => { const hits = sec.children.filter(n => n.type === 'FRAME' && x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height); return hits.map(n => n.name + ' (' + Math.round(x - n.x) + ',' + Math.round(y - n.y) + ' z ' + Math.round(n.width) + 'x' + Math.round(n.height) + ')').join(' | ') || 'poza ramkami'; };
const pts = { 55: [388, 249], 54: [1116, 7893], 53: [3735, 1193], 52: [2684, 1197], 51: [1623, 1174], 50: [1109, 1173] };
const out = {}; for (const [k, [x, y]] of Object.entries(pts)) out['#' + k] = at(x, y);
const f17 = sec.children.find(n => n.name.startsWith('17 '));
const grid = f17.findOne(n => n.name === 'MonthGrid');
out.month = grid ? grid.children.slice(0, 9).map(c => c.name.slice(0, 22)) : 'brak';
return out;
