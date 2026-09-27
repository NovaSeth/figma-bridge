//# opis: cofniecie odstepu w wierszach, odstep tylko pod filtrami
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const log = { cofniete: 0, filtry: [] };
const wInstancji = n => { let k = n.parent; while (k) { if (k.type === 'INSTANCE') return true; k = k.parent; } return false; };
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    const main = f.children.find(c => c.name === 'Main Content');
    if (!main) continue;
    // 1. cofam wszystko, co dostalo 12 px w srodku instancji lub glebiej niz filtr
    for (const rzad of f.findAll(n => n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL' && 'paddingBottom' in n && n.paddingBottom === 12
      && n.children.length >= 2 && n.children.every(c => c.type === 'INSTANCE' && /^Chip/.test(c.name)))) {
      if (!wInstancji(rzad) && rzad.parent === main) continue;
      rzad.paddingBottom = 0;
      log.cofniete++;
    }
    for (const opak of f.findAll(n => n.type === 'FRAME' && /margin/.test(n.name) && 'paddingBottom' in n && n.paddingBottom === 12)) {
      const rzad = opak.children[0];
      if (!rzad || !rzad.children || !rzad.children.every(c => c.type === 'INSTANCE' && /^Chip/.test(c.name))) continue;
      if (opak.parent === main && !wInstancji(opak)) continue;
      opak.paddingBottom = 0;
      log.cofniete++;
    }
    // 2. rzad filtrow to bezposrednie dziecko Main Content
    for (const c of main.children) {
      const rzad = c.layoutMode === 'HORIZONTAL' ? c : (c.children && c.children.length === 1 ? c.children[0] : null);
      if (!rzad || rzad.layoutMode !== 'HORIZONTAL') continue;
      const chipy = rzad.children.filter(x => x.type === 'INSTANCE' && /^Chip/.test(x.name));
      if (chipy.length < 3 || chipy.length !== rzad.children.length) continue;
      if ('paddingBottom' in c && c.paddingBottom < 12) { c.paddingBottom = 12; log.filtry.push(sek.name + ' / ' + f.name); }
    }
  }
}
return { cofniete: log.cofniete, filtry: log.filtry.length, probka: log.filtry.slice(0, 6) };
