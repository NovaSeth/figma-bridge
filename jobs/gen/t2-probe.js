//# opis: sonda struktury Icon tile, List row, Doc-ow i geometrii FAB
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const opis = (n, d) => {
  const linie = [];
  const rek = (x, lvl) => {
    if (lvl > d) return;
    const styl = x.type === 'TEXT' ? ` "${(x.characters||'').slice(0,40)}"` : '';
    const pr = x.componentPropertyReferences ? ' REF:' + JSON.stringify(Object.entries(x.componentPropertyReferences).map(([k,v])=>k+'='+String(v).split('#')[0])) : '';
    linie.push('  '.repeat(lvl) + `${x.name} [${x.type}] ${Math.round(x.x)},${Math.round(x.y)} ${Math.round(x.width)}x${Math.round(x.height)}${styl}${pr}`);
    if ('children' in x) x.children.forEach(c => rek(c, lvl + 1));
  };
  rek(n, 0);
  return linie;
};
const out = {};
// Icon tile
const it = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
out.iconTile = { x: it.x, y: it.y, w: it.width, h: it.height, parent: it.parent.name,
  layout: it.layoutMode, props: it.componentPropertyDefinitions,
  warianty: it.children.map(c => ({ n: c.name, w: c.width, h: c.height, x: c.x, y: c.y, drzewo: opis(c, 3) })) };
// Doc Icon tile na tablicy
const atomy = ds.children.find(c => c.type === 'SECTION' && c.name === 'Atomy');
const board = atomy.children.find(c => c.name === 'Board');
const docIT = board.children.find(c => c.name === 'Doc · Icon tile');
out.docIconTile = { drzewo: opis(docIT, 4), layout: docIT.layoutMode, pad: [docIT.paddingTop, docIT.paddingRight, docIT.paddingBottom, docIT.paddingLeft], spacing: docIT.itemSpacing };
const docChip = board.children.find(c => c.name === 'Doc · Chip');
out.docChip = { drzewo: opis(docChip, 3) };
// List row wariant Icon tile/None
const lr = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const v = lr.children.find(c => c.name === 'Leading=Icon tile, Trailing=None');
out.listRow = { props: lr.componentPropertyDefinitions, wariant: opis(v, 6) };
return out;
