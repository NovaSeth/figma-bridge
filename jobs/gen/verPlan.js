//# opis: kontrola rzedu Plan po przesunieciu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const n of ['15b Plan · szczegóły oferty zajęć','02h Frekwencja · szczegóły dnia']) {
  const f = sec.children.find(x => x.name === n);
  await shot(f, { scale: 0.8, name: 'vQ-' + n.split(' ')[0] });
}
return sec.children.filter(c => c.type === 'FRAME' && c.height !== 874).map(c => c.name + ':' + Math.round(c.height));
