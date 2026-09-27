//# opis: zrzuty wskazanych ramek w obu sekcjach
const NAZWY = __NAZWY__;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sec of page.children.filter(c => c.type === 'SECTION')) {
  const tag = sec.name === 'Jasny motyw' ? 'jasny' : 'ciemny';
  for (const n of NAZWY) {
    const f = sec.children.find(c => c.name === n);
    if (!f) { out.push('BRAK ' + tag + ' ' + n); continue; }
    await shot(f, { scale: 2, name: tag + '-' + n.replace(/[^0-9a-zA-Zа-я]+/g, '_') });
    out.push(tag + ' ' + n + ' ' + Math.round(f.width) + 'x' + Math.round(f.height));
  }
}
return out;
