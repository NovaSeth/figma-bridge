//# opis: kontrola po konsolidacji DS
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
// czy nie zostaly puste instancje po usunietych komponentach
const osierocone = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const i of f.findAll(n => n.type === 'INSTANCE')) {
    const g = await i.getMainComponentAsync();
    if (!g) osierocone.push(f.name + ' / ' + i.name);
  }
}
for (const n of ['02f Teraz · frekwencja','17 Plan · miesiąc','16 Plan · tydzień','18 Plan · rok']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.6, name: 'vKon-' + n.split(' ')[0] });
}
return { osierocone: osierocone.length, probka: osierocone.slice(0, 5) };
