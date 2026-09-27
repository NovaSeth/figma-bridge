//# opis: kontrola, czy rozszerzenia DS nie ruszyly istniejacych ekranow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const j = sek.name === 'Jasny motyw';
  for (const nz of ['02f Teraz · frekwencja', '02h Frekwencja · szczegóły dnia']) {
    const f = sek.children.find(c => c.name === nz);
    if (!f) continue;
    const kpi = f.findOne(n => n.type === 'INSTANCE' && n.name === 'KPI card');
    const wrap = kpi ? kpi.findOne(n => n.name === 'Chip wrap') : null;
    out.push({ sekcja: sek.name, ekran: nz, h: Math.round(f.height),
      chipWidoczny: wrap ? wrap.visible : 'brak',
      showChip: kpi ? Object.entries(kpi.componentProperties).filter(([k]) => /Show chip/.test(k)).map(([k,v]) => v.value) : null,
      pierscienie: f.findAll(n => n.type === 'INSTANCE' && n.name === 'Day ring').length });
    if (j) await shot(f, { scale: 0.7, name: 't3-kontrola-' + nz.slice(0,3).trim() });
  }
}
return out;
