//# opis: zrzut bloku lekcji w powiekszeniu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const sec of page.children.filter(c => c.type === 'SECTION')) {
  const tag = sec.name === 'Jasny motyw' ? 'jasny' : 'ciemny';
  const e = sec.children.find(c => c.name === '15c Plan · zastępstwo i lekcja odwołana');
  const lista = e.findOne(n => n.type === 'FRAME' && n.name.indexOf('List - Plan') === 0);
  await shot(lista, { scale: 6, name: tag + '-15c-bloki' });
}
return 'ok';
