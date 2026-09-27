//# opis: eksport po konsolidacji DS
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const frames = sec.children.filter(c => c.type === 'FRAME').sort((a, b) => a.name.localeCompare(b.name, 'pl'));
let i = 0;
for (const f of frames) {
  i++; progress(i / frames.length, f.name);
  await shot(f, { scale: 1, name: 'fin5-' + f.name.replace(/[^\wÀ-ſ ]/g, '').replace(/\s+/g, '_').slice(0, 38) });
}
return { n: frames.length };
