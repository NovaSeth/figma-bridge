//# opis: listy z wierszami nie potrzebuja wlasnego paddingu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const l of f.findAll(n => n.type === 'FRAME' && n.name === 'List' && 'paddingLeft' in n && n.paddingLeft > 0)) {
    const maWiersze = l.children.some(c => c.type === 'INSTANCE' && /row|Row/.test(c.name));
    if (!maWiersze) continue;
    log.push({ screen: f.name, bylo: l.paddingLeft });
    l.paddingLeft = 0; l.paddingRight = 0;
  }
}
const f02f = sec.children.find(x => x.name === '02f Teraz · frekwencja');
const f02g = sec.children.find(x => x.name === '02g Teraz · ustawienia');
await shot(f02f, { scale: 0.8, name: 'vS-02f' });
await shot(f02g, { scale: 0.8, name: 'vS-02g' });
return log;
