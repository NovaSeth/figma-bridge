//# opis: sekcje jasna i ciemna maja stac obok siebie bez nachodzenia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const jasna = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const ciemna = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
const przed = { jasna: [Math.round(jasna.x), Math.round(jasna.y), Math.round(jasna.width), Math.round(jasna.height)],
                ciemna: [Math.round(ciemna.x), Math.round(ciemna.y), Math.round(ciemna.width), Math.round(ciemna.height)] };
ciemna.x = jasna.x;
ciemna.y = jasna.y + jasna.height + 400;
return { przed, po: { jasna: [Math.round(jasna.x), Math.round(jasna.y), Math.round(jasna.width), Math.round(jasna.height)],
                      ciemna: [Math.round(ciemna.x), Math.round(ciemna.y), Math.round(ciemna.width), Math.round(ciemna.height)] },
  nachodza: !(ciemna.y >= jasna.y + jasna.height || jasna.y >= ciemna.y + ciemna.height) };
