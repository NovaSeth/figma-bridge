// Szlif: karta w tle ekranów 02*, odstęp nad cytatem w oknie odpowiedzi
const isCard = n => n.type === 'FRAME' && n.cornerRadius === 20 && texts(n).some(t => t.characters === 'Ogarnięte');
const inSheet = n => { for (let p = n.parent; p; p = p.parent) if (p.name === 'Bottom sheet') return true; return false; };
const srcCard = byName('01 ').children[1].findOne(isCard);
const swapped = [];
for (const prefix of ['02 ', '02a', '02b', '02c', '02e']) {
  const f = byName(prefix);
  const card = f.children[1].findOne(n => isCard(n) && !inSheet(n));
  if (!card) continue;
  const parent = card.parent, i = parent.children.indexOf(card);
  const fresh = srcCard.clone();
  parent.insertChild(i, fresh);
  fresh.layoutSizingHorizontal = 'FILL';
  card.remove();
  swapped.push(prefix.trim());
}
const b = byName('02b');
const gap = b.findAll(n => n.name === 'Gap');
for (const g of gap) { const parent = g.parent, i = parent.children.indexOf(g); const s = figma.createFrame(); s.name = 'Spacer'; s.fills = []; s.resize(10, 16); parent.insertChild(i, s); g.remove(); }
await shot(byName('02e'), { name: 's-02e', scale: 1 });
await shot(b, { name: 's-02b', scale: 1 });
// Przegląd rzędu Teraz
const row = light.children.filter(n => n.type === 'FRAME' && Math.abs(n.y - byName('01 ').y) < 2).sort((x, y) => x.x - y.x);
return { swapped, gaps: gap.length, row: row.map(n => n.name.slice(0, 26) + ' @' + Math.round(n.x) + ' h' + Math.round(n.height)) };
