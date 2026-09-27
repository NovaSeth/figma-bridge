//# opis: kopia jasnej sekcji jako ciemny motyw
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const jasna = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const stara = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
if (stara) stara.remove();
const kopia = jasna.clone();
kopia.name = 'Ciemny motyw';
page.appendChild(kopia);
kopia.x = jasna.x;
kopia.y = jasna.y + jasna.height + 400;
return { nazwa: kopia.name, x: Math.round(kopia.x), y: Math.round(kopia.y), w: Math.round(kopia.width), h: Math.round(kopia.height),
  ekrany: kopia.children.filter(c => c.type === 'FRAME').length };
