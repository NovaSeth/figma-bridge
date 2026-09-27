//# opis: eksport obu motywow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = {};
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const pre = sek.name === 'Ciemny motyw' ? 'dark2-' : 'fin7-';
  const frames = sek.children.filter(c => c.type === 'FRAME').sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  let i = 0;
  for (const f of frames) {
    i++; progress(i / (frames.length * 2), sek.name + ' / ' + f.name);
    await shot(f, { scale: 1, name: pre + f.name.replace(/[^\wÀ-ſ ]/g, '').replace(/\s+/g, '_').slice(0, 36) });
  }
  out[sek.name] = frames.length;
}
return out;
