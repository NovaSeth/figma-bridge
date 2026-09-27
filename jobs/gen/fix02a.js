//# opis: arkusz pelnoekranowy zaczyna sie pod naglowkiem
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '02a Teraz · szczegóły na pełnym ekranie');
const hdr = f.children.find(c => c.name === 'App header');
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const H = 874;
const wysokosc = H - Math.ceil(hdr ? hdr.height + 12 : 94);
sheet.layoutSizingVertical = 'FIXED';
sheet.resize(sheet.width, wysokosc);
sheet.y = H - wysokosc;
const body = sheet.children.find(c => c.name === 'Body');
if (body) { body.layoutSizingVertical = 'FILL'; body.layoutGrow = 1; body.clipsContent = true; }
await shot(f, { scale: 0.7, name: 'vW-02a' });
return { hdr: hdr ? Math.round(hdr.height) : null, sheetH: Math.round(sheet.height), y: Math.round(sheet.y) };
