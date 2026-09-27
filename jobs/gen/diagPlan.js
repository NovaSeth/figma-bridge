//# opis: audyt widoku miesiaca i roku
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f17 = sec.children.find(x => x.name === '17 Plan · miesiąc');
const out = { naglowki: [], dzis: [], rok: [] };
// naglowki dni tygodnia
for (const t of f17.findAll(n => n.type === 'TEXT' && /^(pon|wt|śr|czw|pt|sob|nd)\.?$/.test(n.characters.trim()))) {
  const fl = t.fills && t.fills[0];
  const b = t.boundVariables && t.boundVariables.fills && t.boundVariables.fills[0];
  out.naglowki.push({ v: t.characters, id: t.id, bold: t.fontName && t.fontName.style, bound: b ? b.id : null,
    rgb: fl && fl.type === 'SOLID' ? [Math.round(fl.color.r*255),Math.round(fl.color.g*255),Math.round(fl.color.b*255)] : null });
}
// komorka dnia 18 i sasiednie
const cells = f17.findAll(n => (n.name === 'Day' || /^Dzień/.test(n.name) || n.name === 'Cell') && 'children' in n);
out.cellNames = [...new Set(f17.findAll(n => 'children' in n).map(n => n.name))].slice(0, 40);
const t18 = f17.findAll(n => n.type === 'TEXT' && n.characters.trim() === '18');
out.dzis = t18.map(t => ({ id: t.id, parent: t.parent.name, gp: t.parent.parent && t.parent.parent.name, visible: t.visible }));
// czy jest gdzies ptaszek zamiast liczby
out.ikony = f17.findAll(n => n.type === 'INSTANCE' && /check|Icon/i.test(n.name)).map(n => ({ n: n.name, parent: n.parent.name, gp: n.parent.parent && n.parent.parent.name })).slice(0, 12);
const f18 = sec.children.find(x => x.name === '18 Plan · rok');
const miesiace = f18.findAll(n => 'children' in n && /Styczeń|Luty|Marzec/.test(n.name));
out.rok = miesiace.map(m => ({ n: m.name, w: Math.round(m.width), h: Math.round(m.height) }));
out.rokNames = [...new Set(f18.findAll(n => 'children' in n).map(n => n.name))].slice(0, 30);
return out;
