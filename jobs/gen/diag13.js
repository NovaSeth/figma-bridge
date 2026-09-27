//# opis: co sie stalo z trescia ekranu 13
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const n of ['13 Nowa wiadomość', '14 Nowa wiadomość · błędy walidacji', '08 Wiadomość · wątek']) {
    const f = sek.children.find(x => x.name === n);
    if (!f) continue;
    const main = f.children.find(c => c.name === 'Main Content');
    out.push({ sek: sek.name.slice(0, 6), screen: n.slice(0, 22), frameH: Math.round(f.height),
      main: main ? { h: Math.round(main.height), sizV: main.layoutSizingVertical, grow: main.layoutGrow, clip: main.clipsContent,
        dzieci: main.children.map(c => c.name + ':' + Math.round(c.height) + (c.visible ? '' : ' (ukryty)')) } : 'brak' });
  }
}
return out;
