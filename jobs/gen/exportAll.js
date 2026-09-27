//# opis: eksport wszystkich ekranow do przegladu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const frames = [];
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) if (f.type === 'FRAME') frames.push({ sec: sec.name, f });
const out = [];
let i = 0;
for (const { sec, f } of frames) {
  i++; progress(i / frames.length, f.name);
  const slug = 'rev-' + (sec.name === 'Ciemny motyw' ? 'd' : 'l') + '-' + f.name.replace(/[^\wÀ-ſ ·]/g, '').replace(/\s+/g, '_').slice(0, 44);
  await shot(f, { scale: 1, name: slug });
  out.push({ file: slug + '.png', screen: f.name, sec: sec.name, h: Math.round(f.height) });
}
return out;
