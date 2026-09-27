//# opis: 02 jako arkusz czesciowy, 02a na pelnym ekranie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const ustaw = (nazwa, h) => {
  const f = sec.children.find(x => x.name === nazwa);
  const sheet = f.children.find(c => c.name === 'Bottom sheet');
  const body = sheet.children.find(c => c.name === 'Body');
  sheet.layoutSizingVertical = 'FIXED';
  sheet.resize(sheet.width, h);
  sheet.clipsContent = true;
  if (body) { body.layoutSizingVertical = 'FILL'; body.layoutGrow = 1; body.clipsContent = true; }
  sheet.y = 874 - h;
  return { nazwa, h: Math.round(sheet.height), y: Math.round(sheet.y) };
};
const out = [ustaw('02 Teraz · szczegóły sprawy (arkusz)', 560), ustaw('02a Teraz · szczegóły na pełnym ekranie', 820)];
for (const n of ['02 Teraz · szczegóły sprawy (arkusz)','02a Teraz · szczegóły na pełnym ekranie','02e Teraz · zdjęcie dziecka','15a Plan · nowe zajęcia','02b Teraz · odpowiedź']) {
  const f = sec.children.find(x => x.name === n);
  await shot(f, { scale: 0.7, name: 'vG-' + n.split(' ')[0] });
}
return out;
