//# opis: porzadki - luzne wezly, nachodzenie wpisow Doc na tablicy, przeglad rzedu Teraz
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const out = { luzne: [], tablica: [], naprawione: [] };
out.luzne = page.children.filter(c => c.type !== 'SECTION').map(c => c.name + ' <' + c.type + '>');
for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
  const board = sek.children.find(c => c.name === 'Board');
  if (!board) continue;
  const dzieci = board.children.slice().sort((a, b) => a.y - b.y);
  // wpisy Doc stoja jeden pod drugim; po rozszerzeniu zestawow trzeba je przesunac
  let y = dzieci.length ? dzieci[0].y : 32;
  for (const d of dzieci) {
    if (Math.round(d.y) !== Math.round(y)) { out.naprawione.push(sek.name + ' / ' + d.name + ': ' + Math.round(d.y) + ' → ' + Math.round(y)); d.y = y; }
    y += d.height + 32;
  }
  out.tablica.push(sek.name + ': ' + dzieci.length + ' wpisów, dół ' + Math.round(y));
}
await figma.setCurrentPageAsync(page);
const sek = page.children.find(c => c.type === 'SECTION' && c.name === 'Jasny motyw');
out.rzadTeraz = sek.children.filter(c => c.type === 'FRAME' && Math.round(c.y) === 280).sort((a,b)=>a.x-b.x)
  .map(c => c.name + ' @' + Math.round(c.x) + ' ' + Math.round(c.width) + 'x' + Math.round(c.height));
return out;
