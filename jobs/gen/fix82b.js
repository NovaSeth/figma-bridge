//# opis: #82 rytm pionowy na Ustawieniach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = light.children.find(x => x.name === '02g Teraz · ustawienia');
const main = f.children.find(c => c.name === 'Main Content');
main.itemSpacing = 8;
const log = [];
const heads = main.children.filter(c => c.name === 'Section heading');
for (let i = 0; i < heads.length; i++) {
  if (i === 0) continue;
  try { heads[i].paddingTop = 16; log.push('nagłówek ' + i + ': padding 16'); }
  catch (e) { log.push('nagłówek ' + i + ': ' + e.message); }
}
// pierwsza karta: sprawdzam czy to jedna lista czy dwie
const firstList = main.children.find(c => c.name === 'List');
const info = { kids: firstList.children.map(c => ({ n: c.name, t: c.type, y: Math.round(c.y), h: Math.round(c.height),
  fill: c.fills && c.fills[0] && c.fills[0].type === 'SOLID' ? [Math.round(c.fills[0].color.r*255),Math.round(c.fills[0].color.g*255),Math.round(c.fills[0].color.b*255)] : 'none',
  r: c.cornerRadius })), listFill: firstList.fills && firstList.fills[0] && firstList.fills[0].type === 'SOLID' ? 'solid' : 'none', listR: firstList.cornerRadius, gap: firstList.itemSpacing };
await shot(f, { scale: 1, name: 'v82-ustawienia' });
return { log, info, h: Math.round(main.height) };
