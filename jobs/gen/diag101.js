//# opis: naglowek i przycisk na ekranie watku
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '08 Wiadomość · wątek');
const main = f.children.find(c => c.name === 'Main Content');
const d = (n, lvl) => ({ n: n.name, t: n.type, h: Math.round(n.height), layout: n.layoutMode || null, align: n.primaryAxisAlignItems,
  txt: n.type === 'TEXT' ? n.characters.slice(0, 30) : null,
  props: n.type === 'INSTANCE' && n.componentProperties ? Object.keys(n.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(n.componentProperties[k].value)).join(',').slice(0, 90) : null,
  kids: lvl > 0 && 'children' in n ? n.children.map(c => d(c, lvl - 1)) : null });
// naglowek ekranu i rzad przyciskow
const naglowek = main.children.slice(0, 2).map(c => d(c, 3));
const przyciski = main.findAll(n => n.type === 'INSTANCE' && n.name === 'Button').map(b => ({
  label: Object.keys(b.componentProperties || {}).map(k => b.componentProperties[k].value).join('|').slice(0, 40),
  rodzic: b.parent.name, rodzicLayout: b.parent.layoutMode, rodzicAlign: b.parent.primaryAxisAlignItems, w: Math.round(b.width), x: Math.round(b.x) }));
// zakladka Wiadomosci na 07
const f07 = sec.children.find(x => x.name === '07 Wiadomości · odebrane');
const tabs = f07.children.find(c => c.name === 'Tab bar');
const zakladki = tabs.children.map(c => ({ n: c.name, props: c.componentProperties ? Object.keys(c.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(c.componentProperties[k].value)).join(',') : null }));
return { naglowek, przyciski, zakladki };
