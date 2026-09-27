//# opis: koncowki zapowiedzi na 07
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '07 Wiadomości · odebrane');
const out = [];
for (const t of f.findAll(n => n.type === 'TEXT' && n.characters.length > 30)) {
  const v = t.characters;
  out.push({ id: t.id, koniec: JSON.stringify(v.slice(-12)), kody: v.slice(-6).split('').map(c => c.charCodeAt(0)) });
}
// DS App header padding
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const hdr = ds.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === 'App header');
const pad = hdr ? (hdr.type === 'COMPONENT' ? [hdr.paddingTop, hdr.paddingRight, hdr.paddingBottom, hdr.paddingLeft] : hdr.children.map(c => [c.name, c.paddingLeft, c.paddingRight])) : null;
return { koncowki: out, dsHeader: pad };
