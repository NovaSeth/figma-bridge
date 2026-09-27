//# opis: instancja banera na ekranie 20
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const b of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Banner')) {
    const rec = { screen: f.name, przed: { h: Math.round(b.height), sizV: b.layoutSizingVertical, kids: b.children.map(c => c.name + ':' + c.layoutPositioning + '@' + Math.round(c.y) + 'h' + Math.round(c.height) + ':' + c.layoutSizingVertical) } };
    b.layoutSizingVertical = 'HUG';
    for (const c of b.children) {
      if (c.type !== 'TEXT') continue;
      try { c.textAutoResize = 'HEIGHT'; } catch (e) {}
      try { c.layoutSizingHorizontal = 'FILL'; } catch (e) {}
      try { c.layoutSizingVertical = 'HUG'; } catch (e) {}
    }
    rec.po = { h: Math.round(b.height), kids: b.children.map(c => c.name + '@' + Math.round(c.y) + 'h' + Math.round(c.height)) };
    log.push(rec);
    await shot(f, { scale: 0.5, name: 'vO-' + f.name.split(' ')[0] });
  }
}
return log;
