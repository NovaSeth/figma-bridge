//# opis: baner bledu z akcja na ekranie 20
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const b of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Banner')) {
    const p = b.componentProperties || {};
    const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
    const set = {};
    if (k('Text')) set[k('Text')] = 'Nie udało się odświeżyć. Pokazujemy ostatnie poprawne dane z 18.09.2026, 15:20.';
    if (k('Show action')) set[k('Show action')] = true;
    if (k('Action')) set[k('Action')] = 'Spróbuj ponownie';
    b.setProperties(set);
    log.push({ screen: f.name, props: Object.keys(b.componentProperties).map(x => x.split('#')[0] + '=' + JSON.stringify(b.componentProperties[x].value)).join(' | ') });
  }
  if (log.length && f.name.indexOf('20 Stan') === 0) await shot(f, { scale: 0.6, name: 'vC-20' });
}
return log;
