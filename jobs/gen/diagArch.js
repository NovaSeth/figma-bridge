//# opis: przycisk Archiwizuj i wiersze Zrobione/Archiwum
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f04 = sec.children.find(x => x.name === '04 Zadania');
const btns = f04.findAll(n => n.type === 'INSTANCE' && n.name === 'Button').map(b => ({
  w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.x), rodzic: b.parent.name,
  padR: 'paddingRight' in b.parent ? b.parent.paddingRight : null,
  label: Object.keys(b.componentProperties || {}).map(k => b.componentProperties[k].value).join('|').slice(0, 30)
}));
const f05 = sec.children.find(x => x.name === '05 Zadania · zrobione i archiwum');
const sekcje = [];
for (const h of f05.findAll(n => n.type === 'INSTANCE' && n.name === 'Disclosure')) {
  const p = h.componentProperties || {};
  sekcje.push(Object.keys(p).map(k => k.split('#')[0] + '=' + JSON.stringify(p[k].value)).join(' | '));
}
const wiersze = f05.findAll(n => n.type === 'INSTANCE' && /row/i.test(n.name)).map(r => {
  const p = r.componentProperties || {};
  return { n: r.name, props: Object.keys(p).map(k => k.split('#')[0] + '=' + JSON.stringify(p[k].value)).join(' | ').slice(0, 170) };
});
return { btns, sekcje, wiersze: wiersze.slice(-4) };
