//# Kontekst komentarzy #50–#56 (współrzędne bezwzględne)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'Jasny motyw');
const sb = sec.absoluteBoundingBox;
const hit = (ox, oy) => { const X = sb.x + ox, Y = sb.y + oy;
  const frames = sec.children.filter(n => n.type === 'FRAME').map(n => ({ n, b: n.absoluteBoundingBox })).filter(({ b }) => X >= b.x && X <= b.x + b.width && Y >= b.y && Y <= b.y + b.height);
  if (!frames.length) { const near = sec.children.filter(n => n.type === 'FRAME').map(n => ({ name: n.name, d: Math.hypot(n.absoluteBoundingBox.x + n.width / 2 - X, n.absoluteBoundingBox.y + n.height / 2 - Y) })).sort((a, b2) => a.d - b2.d)[0]; return 'poza: najbliżej ' + near.name.slice(0, 22); }
  const { n, b } = frames[0]; const lx = X - b.x, ly = Y - b.y;
  const inner = n.findAll(c => { const cb = c.absoluteBoundingBox; return cb && X >= cb.x && X <= cb.x + cb.width && Y >= cb.y && Y <= cb.y + cb.height; }).slice(-3).map(c => c.type[0] + ':' + c.name.slice(0, 18));
  return n.name.slice(0, 26) + ' @' + Math.round(lx) + ',' + Math.round(ly) + ' → ' + inner.join(' > '); };
const pts = { 50: [1109, 1173], 51: [1623, 1174], 52: [2684, 1197], 53: [3735, 1193], 54: [1116, 7893], 55: [388, 249] };
const out = {}; for (const [k, [x, y]] of Object.entries(pts)) out['#' + k] = hit(x, y);
const f20 = page.children.flatMap(s => s.type === 'SECTION' ? s.children : []).find(n => n.name.startsWith('17 '));
const dsec = page.children.find(n => n.type === 'SECTION' && n.name === 'Ciemny motyw');
const f17d = dsec.children.find(n => n.name.startsWith('17 '));
out.monthFrames = [f20 && f20.name, f17d && f17d.name];
return out;
