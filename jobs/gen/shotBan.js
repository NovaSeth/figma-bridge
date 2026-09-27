//# opis: zblizenie na baner 20
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '20 Stan · błąd odświeżania');
const b = f.findOne(n => n.type === 'INSTANCE' && n.name === 'Banner');
await shot(b, { scale: 2, name: 'vO-baner' });
return { h: Math.round(b.height), teksty: b.findAll(n => n.type === 'TEXT').map(t => ({ n: t.name, v: t.characters, y: Math.round(t.y), h: Math.round(t.height), vis: t.visible })) };
