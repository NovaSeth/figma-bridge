//# opis: co jest w DS, a co zrobione recznie
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const komponenty = ds.findAll(n => n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && (!n.parent || n.parent.type !== 'COMPONENT_SET'))).map(n => n.name);
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const opis = (ekran, nazwa) => {
  const f = sec.children.find(x => x.name === ekran);
  const n = f && f.findOne(x => x.name === nazwa);
  if (!n) return null;
  return { n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height), rodzic: n.parent.name,
    kids: 'children' in n ? n.children.map(c => c.name + ':' + c.type + (c.type === 'TEXT' ? '=' + c.characters.slice(0, 24) : '')) : null };
};
return {
  komponenty: komponenty.sort(),
  lessons: opis('17 Plan · miesiąc', 'Lessons'),
  boldText: opis('16 Plan · tydzień', 'Bold Text'),
  reply: opis('02b Teraz · odpowiedź', 'Reply field'),
  quote: opis('02b Teraz · odpowiedź', 'Quote'),
  input15a: opis('15a Plan · nowe zajęcia', 'Input'),
  sheet: opis('02 Teraz · szczegóły sprawy (arkusz)', 'Bottom sheet')
};
