//# opis: eksport koncowy po wszystkich poprawkach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const frames = sec.children.filter(c => c.type === 'FRAME').sort((a, b) => a.name.localeCompare(b.name, 'pl'));
const out = [];
let i = 0;
for (const f of frames) {
  i++; progress(i / frames.length, f.name);
  const slug = 'fin2-' + f.name.replace(/[^\wÀ-ſ ]/g, '').replace(/\s+/g, '_').slice(0, 38);
  await shot(f, { scale: 1, name: slug });
  out.push({ screen: f.name, h: Math.round(f.height) });
}
return { n: out.length, wysokosci: out.filter(o => o.h !== 874).map(o => o.screen + ':' + o.h) };
