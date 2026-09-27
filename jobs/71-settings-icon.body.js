//# #34: lżejsza i większa ikona ustawień w nagłówku
const light = { family: 'Material Symbols Rounded', style: 'Light' };
await figma.loadFontAsync(light);
let n = 0;
for (const { f, T } of screens()) {
  const btn = f.children[0] && f.children[0].findOne(x => x.name === 'Button - Ustawienia'); if (!btn) continue;
  const ic = btn.findOne(isIcon); if (!ic) continue;
  await figma.loadFontAsync(ic.fontName);
  ic.fontName = light; ic.fontSize = 28; ic.lineHeight = { unit: 'PIXELS', value: 28 }; ic.fills = solid(T.ink);
  n++;
}
const h = sections[0].children.find(x => x.name.startsWith('01 ')).children[0];
await shot(h, { name: 'v-hdr', scale: 2 });
return { changed: n };
