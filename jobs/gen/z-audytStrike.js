//# opis: audyt przekreslen w calym pliku
const out = { styl: (await figma.getLocalTextStylesAsync()).find(x => x.name === 'label/md').textDecoration, przekreslone: [] };
for (const p of figma.root.children) {
  await p.loadAsync();
  for (const n of p.findAllWithCriteria({ types: ['TEXT'] })) {
    const d = n.textDecoration;
    if (d === figma.mixed || d === 'STRIKETHROUGH') out.przekreslone.push(p.name + ' | ' + n.name + ' | ' + n.characters.slice(0, 32) + ' | ' + (d === figma.mixed ? 'mixed' : d));
  }
}
return out;
