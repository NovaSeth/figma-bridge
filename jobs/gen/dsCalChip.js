//# opis: komponent Calendar chip w DS
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f17 = sec.children.find(x => x.name === '17 Plan · miesiąc');
// zbieram wzorce kolorów z istniejących chipów w siatce
const wzorce = {};
for (const n of f17.findAll(x => x.type === 'FRAME' && x.fills && x.fills !== figma.mixed && x.fills.length && x.children.length === 1 && x.children[0].type === 'TEXT' && x.height < 20)) {
  const t = n.children[0];
  const b = n.boundVariables && n.boundVariables.fills && n.boundVariables.fills[0];
  const bt = t.boundVariables && t.boundVariables.fills && t.boundVariables.fills[0];
  const klucz = /zad\./.test(t.characters) ? 'Zadania' : /^\d/.test(t.characters) ? 'Lekcje' : 'Szkoła';
  if (!wzorce[klucz]) wzorce[klucz] = { nazwa: n.name, tlo: b ? b.id : null, tekst: bt ? bt.id : null, r: n.cornerRadius, pad: [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft], h: Math.round(n.height), styl: t.textStyleId };
}
return wzorce;
