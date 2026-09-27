// Nowe ekrany stanów: miejsce w rzędzie Teraz + arkusz na pełnym ekranie
const STEP = 522, NEW = [['02a Teraz · szczegóły na pełnym ekranie', '02 '], ['02b Teraz · odpowiedź', '02 '], ['02c Teraz · szczegóły ogłoszenia', '02 '], ['02d Teraz · wybór dziecka', '01 '], ['02e Teraz · zdjęcie dziecka', '02 ']];
const f02 = byName('02 ');
const created = [];
if (!byName('02a')) {
  for (const f of light.children.filter(n => n.type === 'FRAME' && Math.abs(n.y - f02.y) < 2 && n.x > f02.x)) f.x += STEP * NEW.length;
  NEW.forEach(([name, src], i) => { const c = byName(src).clone(); light.appendChild(c); c.name = name; c.x = f02.x + STEP * (i + 1); c.y = f02.y; created.push(c.id); });
  const right = Math.max(...light.children.filter(n => n.type === 'FRAME').map(n => n.x + n.width));
  const grow = right + 160 - light.width;
  if (grow > 0) { light.resizeWithoutConstraints(light.width + grow, light.height); const dark = page.children.find(n => n.type === 'SECTION' && n.name === 'Ciemny motyw'); dark.x += grow; }
}
// 02a: arkusz po przewinięciu rośnie na pełny ekran
const a = byName('02a');
const sheet = a.findOne(n => n.name === 'Bottom sheet'), body = sheet.findOne(n => n.name === 'Body'), actions = sheet.findOne(n => n.name === 'Actions');
const H = 874 - 52;
body.layoutSizingVertical = 'FIXED';
body.resize(body.width, H - 44 - 44 - actions.height);
placeSheet(a, sheet);
await shot(a, { name: 's-02a', scale: 1 });
return { created, sheetH: sheet.height, lightW: light.width };
