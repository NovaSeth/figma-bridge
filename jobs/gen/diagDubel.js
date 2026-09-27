//# opis: czy nowe komponenty dubluja istniejace
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const opis = nazwa => {
  const n = ds.findOne(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && x.name === nazwa);
  if (!n) return null;
  const w = n.type === 'COMPONENT_SET' ? n.children : [n];
  return { typ: n.type, warianty: w.map(v => v.name), props: Object.keys(n.componentPropertyDefinitions || {}).map(k => k.split('#')[0] + ':' + n.componentPropertyDefinitions[k].type),
    rozmiar: w.map(v => Math.round(v.width) + 'x' + Math.round(v.height)) };
};
// jak zbudowana jest legenda w Planie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f15 = sec.children.find(x => x.name === '15 Plan · dzień');
const legendaPlan = f15.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name)).slice(0, 5).map(n => ({
  n: n.name, h: Math.round(n.height), props: Object.keys(n.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(n.componentProperties[k].value)).join(' | ') }));
await figma.setCurrentPageAsync(ds);
return { chip: opis('Chip'), calendarChip: opis('Calendar chip'), dayBadge: opis('Day badge'), dayMini: opis('Calendar day mini'), dayRing: opis('Day ring'), legendItem: opis('Legend item'), legendaPlan };
