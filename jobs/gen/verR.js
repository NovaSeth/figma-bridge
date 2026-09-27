//# opis: kontrola rytmu naglowkow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const n of ['21 Stan · pusto (Teraz)','01 Teraz','04 Zadania']) {
  const f = sec.children.find(x => x.name === n);
  await shot(f, { scale: 0.7, name: 'vR-' + n.split(' ')[0] });
}
return 'ok';
