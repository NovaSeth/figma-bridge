//# opis: siatka miesiaca - komorki
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f17 = sec.children.find(x => x.name === '17 Plan · miesiąc');
// wiersz z naglowkami
const nag = (await figma.getNodeByIdAsync('20:75')).parent;
const grid = nag.parent;
const out = { nag: nag.name, grid: grid.name, gridKids: grid.children.map(c => ({ n: c.name, t: c.type, h: Math.round(c.height), kids: 'children' in c ? c.children.length : 0 })) };
// trzeci wiersz tygodnia (14-20)
const wiersze = grid.children.filter(c => c !== nag && 'children' in c);
out.wiersz3 = wiersze[2] ? wiersze[2].children.map(c => ({ n: c.name, t: c.type, kids: 'children' in c ? c.children.map(k => k.name + ':' + k.type + (k.type === 'TEXT' ? '=' + k.characters : '')) : null })) : null;
out.wiersz1 = wiersze[0] ? wiersze[0].children.map(c => ({ n: c.name, kids: 'children' in c ? c.children.map(k => k.name + ':' + k.type + (k.type === 'TEXT' ? '=' + k.characters : '')) : null })) : null;
// kolor naglowkow: pelny zapis fills
const kolory = [];
for (const id of ['20:75','20:90','20:93']) {
  const t = await figma.getNodeByIdAsync(id);
  kolory.push({ id, fills: JSON.stringify(t.fills), bound: JSON.stringify(t.boundVariables), style: t.textStyleId ? 'ma styl' : 'brak' });
}
out.kolory = kolory;
return out;
