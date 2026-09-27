//# opis: struktura ekranu 21
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '21 Stan · pusto (Teraz)');
const main = f.children.find(c => c.name === 'Main Content');
const dump = (n, d) => ({ n: n.name, t: n.type, h: Math.round(n.height), v: n.type === 'TEXT' ? n.characters.slice(0, 40) : null,
  props: n.type === 'INSTANCE' && n.componentProperties ? Object.keys(n.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(n.componentProperties[k].value)).join(' | ') : null,
  kids: d > 0 && 'children' in n ? n.children.map(c => dump(c, d - 1)) : null });
return main.children.map(c => dump(c, 3));
