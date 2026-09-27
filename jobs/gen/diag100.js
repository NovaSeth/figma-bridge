//# opis: stan zakladek na kazdym ekranie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const out = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const tabs = f.children.find(c => c.name === 'Tab bar');
  if (!tabs) continue;
  const p = tabs.componentProperties || {};
  const pozycje = tabs.findAll(n => n.type === 'INSTANCE' && n.name === 'Tab item').map(t => {
    const tp = t.componentProperties || {};
    return Object.keys(tp).map(k => k.split('#')[0] + '=' + JSON.stringify(tp[k].value)).join(',');
  });
  out.push({ screen: f.name, props: Object.keys(p).map(k => k.split('#')[0] + '=' + JSON.stringify(p[k].value)).join(' | '), pozycje: pozycje.slice(0, 5) });
}
return out.slice(0, 8);
