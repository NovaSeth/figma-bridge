//# opis: zdanie zakladki ma sie zawijac w ramce, nie uciekac poza nia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const nz of ['06a Oceny · oceny cyfrowe', '06b Oceny · oceny opisowe']) {
    const f = sek.children.find(c => c.name === nz);
    if (!f) { out.push({ sekcja: sek.name, ekran: nz, stan: 'BRAK' }); continue; }
    const main = f.children.find(c => c.name === 'Main Content');
    const par = main.children.find(c => c.name === 'Paragraph:margin');
    const t = par.findOne(n => n.type === 'TEXT');
    const przed = { auto: t.textAutoResize, w: Math.round(t.width), h: Math.round(f.height) };
    t.textAutoResize = 'HEIGHT';
    t.layoutSizingHorizontal = 'FILL';
    out.push({ sekcja: sek.name, ekran: nz, przed, po: { auto: t.textAutoResize, w: Math.round(t.width), linie: Math.round(t.height), wysokoscRamki: Math.round(f.height) } });
  }
}
return out;
