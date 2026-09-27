//# opis: oddech na dole arkusza 02h
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '02h Frekwencja · szczegóły dnia');
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const body = sheet.children.find(c => c.name === 'Body');
const przed = [body.paddingTop, body.paddingBottom];
body.paddingBottom = 28;
sheet.y = 874 - sheet.height;
await shot(f, { scale: 1, name: 'v78-dzien' });
return { przed, po: [body.paddingTop, body.paddingBottom], sheetH: Math.round(sheet.height), y: Math.round(sheet.y) };
