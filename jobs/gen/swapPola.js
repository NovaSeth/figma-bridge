//# opis: pola i cytat na instancje DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const setTF = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Text field');
const setQ = ds.findOne(n => (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === 'Quote');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const opis = {};
for (const [ekran, nazwa] of [['02b Teraz · odpowiedź','Reply field'],['02b Teraz · odpowiedź','Quote'],['15a Plan · nowe zajęcia','Input'],['16 Plan · tydzień','Bold Text']]) {
  const f = sec.children.find(x => x.name === ekran);
  const n = f && f.findOne(x => x.name === nazwa);
  if (!n) continue;
  opis[ekran + ' / ' + nazwa] = { t: n.type, w: Math.round(n.width), h: Math.round(n.height), rodzic: n.parent.name,
    kids: 'children' in n ? n.children.map(c => c.name + ':' + c.type + (c.type === 'TEXT' ? '=' + c.characters.slice(0, 40) : '')) : null };
}
return { warianty: setTF ? setTF.children.map(c => c.name) : null, quote: setQ ? setQ.type : 'brak', opis };
