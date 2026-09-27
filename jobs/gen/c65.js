//# #65: usunięcie linii pod nagłówkiem aplikacji
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const hdr = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'App header');
const before = hdr ? [hdr.strokeTopWeight, hdr.strokeBottomWeight, hdr.strokes.length].join('/') : 'brak';
if (hdr) { hdr.strokes = []; hdr.strokeBottomWeight = 0; }
// gdyby gdzieś zostały nadpisania na instancjach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
let cleared = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const i of f.children.filter(c => c.type === 'INSTANCE' && c.name === 'App header')) { if (i.strokes.length) { i.strokes = []; cleared++; } }
  for (const b of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Cover top bar')) { if (b.strokes.length) { b.strokes = []; cleared++; } }
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('01 '), { name: 'c-65', scale: 0.45 });
return { before, cleared };
