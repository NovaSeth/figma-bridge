//# opis: odstepy naglowek - karta
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const mierz = (nazwa) => {
  const f = sec.children.find(x => x.name === nazwa);
  const main = f.children.find(c => c.name === 'Main Content');
  const abs = n => { let y = 0, k = n; while (k && k !== f) { y += k.y; k = k.parent; } return y; };
  const out = [];
  for (const h of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Section heading')) {
    const dol = abs(h) + h.height;
    // najbliższa karta pod nagłówkiem
    let naj = null;
    for (const l of f.findAll(n => n.type === 'FRAME' && (n.name === 'List' || n.name === 'Feed'))) {
      const gora = abs(l);
      if (gora >= dol - 1 && (!naj || gora < naj.gora)) naj = { gora, n: l.name };
    }
    out.push({ tytul: (h.findOne(t => t.type === 'TEXT') || {}).characters, dolNaglowka: Math.round(dol), goraKarty: naj ? Math.round(naj.gora) : null, odstep: naj ? Math.round(naj.gora - dol) : null });
  }
  return { ekran: nazwa, mainGap: main.itemSpacing, bloki: main.children.map(c => c.name + ':' + Math.round(c.y) + '+' + Math.round(c.height) + ' gap' + (c.itemSpacing || 0)), naglowki: out };
};
return [mierz('01 Teraz'), mierz('21 Stan · pusto (Teraz)')];
