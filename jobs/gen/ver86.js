//# opis: kontrola banera na ekranie 20
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '20 Stan · błąd odświeżania');
const b = f.findOne(n => n.type === 'INSTANCE' && n.name === 'Banner');
const kPokaz = Object.keys(b.componentProperties).find(x => x.split('#')[0] === 'Show action');
if (kPokaz) b.setProperties({ [kPokaz]: true });
const btn = b.findOne(n => n.type === 'INSTANCE' && n.name === 'Action');
if (btn) {
  const kL = Object.keys(btn.componentProperties || {}).find(x => x.split('#')[0] === 'Label');
  if (kL) btn.setProperties({ [kL]: 'Spróbuj ponownie' });
}
await shot(b, { scale: 2, name: 'vAB-20' });
return { h: Math.round(b.height), props: Object.keys(b.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(b.componentProperties[k].value)).join(' | '), przycisk: btn ? btn.name : 'brak' };
