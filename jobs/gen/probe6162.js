//# Kontekst #61 i #62
const out = {};
for (const id of ['47:6561']) { const n = await figma.getNodeByIdAsync(id); if (!n) { out[id] = 'brak'; continue; }
  let p = n, chain = []; while (p) { chain.push(p.type[0] + ':' + p.name.slice(0, 22)); p = p.parent; }
  out[id] = { node: n.name, type: n.type, size: Math.round(n.width) + 'x' + Math.round(n.height), chain: chain.slice(0, 5).join(' < '), page: chain[chain.length - 2] };
  if (n.type === 'COMPONENT' || n.type === 'INSTANCE' || n.type === 'FRAME') out[id].padding = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(Math.round).join('/');
}
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const tb = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Tab bar');
const v = tb ? tb.children[0] : null;
out.tabbar = v ? { variant: v.name, padding: [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(Math.round).join('/'), h: Math.round(v.height), pill: (() => { const p = v.findOne(x => x.name === 'Pill'); return p ? Math.round(p.width) + 'x' + Math.round(p.height) : null; })() } : 'brak';
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await page.loadAsync();
out.mockupsExtras = page.children.filter(n => n.type !== 'SECTION').map(n => n.type + ' ' + n.name.slice(0, 40));
out.dsExtras = ds.children.filter(n => n.type !== 'SECTION').map(n => n.type + ' ' + n.name.slice(0, 40) + ' @' + Math.round(n.x) + ',' + Math.round(n.y));
return out;
