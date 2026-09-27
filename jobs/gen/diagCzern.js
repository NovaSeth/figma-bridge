//# opis: szukam zepsutych powiazan koloru (czarne tlo mimo tokenu)
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) byId[v.id] = v.name;
const CZARNE = ['color/on-surface', 'neutral/1000', 'neutral/900', 'color/primary', 'color/inverse-surface', 'color/scrim', 'color/on-primary-container', 'color/badge'];
const wynik = { ds: [], makiety: [] };
const sprawdz = (n, gdzie, ekran) => {
  const b = n.boundVariables && n.boundVariables.fills && n.boundVariables.fills[0];
  if (!b) return;
  const f = n.fills && n.fills !== figma.mixed && n.fills[0];
  if (!f || f.type !== 'SOLID') return;
  const czarny = f.color.r < 0.02 && f.color.g < 0.02 && f.color.b < 0.02;
  if (!czarny) return;
  const token = byId[b.id];
  if (CZARNE.indexOf(token) >= 0) return;
  gdzie.push({ ekran, node: n.name, typ: n.type, token });
};
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const n of ds.findAll(() => true)) sprawdz(n, wynik.ds, 'DS');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const f of sec.children) { if (f.type !== 'FRAME') continue; for (const n of f.findAll(() => true)) sprawdz(n, wynik.makiety, f.name); }
const zlicz = arr => { const m = {}; arr.forEach(x => { const k = x.node + ' / ' + x.token; m[k] = (m[k] || 0) + 1; }); return m; };
return { ds: zlicz(wynik.ds), dsN: wynik.ds.length, makiety: zlicz(wynik.makiety), makietyN: wynik.makiety.length, probka: wynik.makiety.slice(0, 5) };
