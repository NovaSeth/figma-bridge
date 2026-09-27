//# opis: chipy "Dzis · dzis" i podtytul wiersza
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const out = { chipy: 0, podtytuly: [], wzorzec02a: [] };
// 1. chip terminu: jedna etykieta zamiast sklejonej
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const inst of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Chip')) {
    const p = inst.componentProperties || {};
    const k = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    if (!k) continue;
    const v = String(p[k].value);
    if (/(dziś|Dziś)\s*·\s*dziś/i.test(v)) { inst.setProperties({ [k]: 'dziś' }); out.chipy++; }
  }
}
// 2. podtytul wiersza w "Poprzednie wiadomosci": temat, nie inicjaly
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const a02a = light.children.find(x => x.name === '02a Teraz · szczegóły na pełnym ekranie');
const rows02a = a02a.findAll(n => n.type === 'INSTANCE' && n.name === 'Feed row');
out.wzorzec02a = rows02a.map(r => {
  const p = r.componentProperties || {};
  return Object.keys(p).filter(k => ['Title','Subtitle','Preview','Value'].indexOf(k.split('#')[0]) >= 0).map(k => k.split('#')[0] + '=' + JSON.stringify(p[k].value));
});
return out;
