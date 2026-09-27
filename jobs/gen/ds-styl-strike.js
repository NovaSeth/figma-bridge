//# opis: styl tekstu label/md-strike i podpiecie go pod wariant Cancelled
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const style = await figma.getLocalTextStylesAsync();
const baza = style.find(s => s.name === 'label/md');
let strike = style.find(s => s.name === 'label/md-strike');
if (!strike) {
  strike = figma.createTextStyle();
  strike.name = 'label/md-strike';
}
strike.fontName = baza.fontName;
strike.fontSize = baza.fontSize;
strike.lineHeight = baza.lineHeight;
strike.letterSpacing = baza.letterSpacing;
strike.textDecoration = 'STRIKETHROUGH';
// Przekreslenia nie da sie wlaczyc na samym wezle wewnatrz zestawu wariantow:
// Figma synchronizuje wlasciwosci tekstu miedzy wariantami i zapala je we
// wszystkich szesciu naraz. Osobny styl jest jedynym miejscem, gdzie stan
// „odwolana" da sie zapisac raz i tylko tam, gdzie ma obowiazywac.
strike.description = 'label/md z przekreśleniem. Tytuł rzeczy, której nie będzie: odwołana lekcja (Calendar event / State=Cancelled). Reszta metryki bez zmian, żeby wysokość bloku była ta sama co w State=Default.';
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar event');
const can = set.children.find(x => x.name === 'Kind=Lesson, State=Cancelled');
const t = can.children.find(n => n.type === 'TEXT');
t.name = 'Title';
await t.setTextStyleIdAsync(strike.id);
return { styl: strike.name, deco: t.textDecoration, nazwa: t.name };
