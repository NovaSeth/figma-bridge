// Kontekst komentarzy: warstwa pod każdą pinezką
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const PINS = [[9,'3:2',92,17],[10,'3:2',320,78],[11,'5:2',337,380],[12,'5:2',263,490],[13,'5:2',208,824],[14,'3:2',138,296],[15,'3:2',325,1822],[16,'3:2',348,1929],[17,'3:2',362,2029],[18,'3:2',366,2184],[19,'3:2',185,2111],[20,'7:2',148,1110],[21,'2:2',1098,4587],[22,'9:2',196,301],[23,'10:2',156,174],[24,'10:2',251,333],[25,'11:2',92,613],[26,'11:2',159,673],[27,'11:2',166,561],[28,'13:2',104,541],[29,'18:2',66,131],[30,'20:2',264,548],[31,'47:1274',311,132]];
const out = [];
for (const [no, id, ox, oy] of PINS) {
  const root = await figma.getNodeByIdAsync(id);
  const ax = root.absoluteTransform[0][2] + ox, ay = root.absoluteTransform[1][2] + oy;
  const hit = n => { const b = n.absoluteBoundingBox; return b && n.visible !== false && ax >= b.x && ax <= b.x + b.width && ay >= b.y && ay <= b.y + b.height; };
  let cur = root, path = [];
  for (;;) {
    const kids = 'children' in cur ? cur.children.filter(hit) : [];
    if (!kids.length) break;
    cur = kids[kids.length - 1]; path.push(cur);
  }
  let box = cur; while (box.parent && box !== root && (!('findAllWithCriteria' in box) || box.findAllWithCriteria({ types: ['TEXT'] }).length < 2)) box = box.parent;
  const around = 'findAllWithCriteria' in box ? box.findAllWithCriteria({ types: ['TEXT'] }).slice(0, 7).map(t => t.characters.slice(0, 48)) : [];
  out.push('#' + no + ' ' + root.name.slice(0, 18) + ' → ' + cur.type + ' ' + cur.id + " '" + (cur.type === 'TEXT' ? cur.characters.slice(0, 50) : cur.name.slice(0, 30)) + "' | path: " + path.slice(-4).map(p => p.name.slice(0, 16)).join(' > ') + ' | around: ' + around.join(' ¦ '));
}
const sec = await figma.getNodeByIdAsync('2:2');
const near = sec.children.filter(n => n.type === 'FRAME' && Math.abs(n.x + n.width / 2 - 1098) < 400 && 4587 > n.y - 200 && 4587 < n.y + n.height + 200).map(n => n.name + ' x' + Math.round(n.x) + ' y' + Math.round(n.y) + ' h' + Math.round(n.height));
return { out, near21: near };
