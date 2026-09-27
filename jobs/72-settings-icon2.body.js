//# #34: ikona ustawień jako świeża warstwa w odmianie Light
const font = { family: 'Material Symbols Rounded', style: 'Light' };
await figma.loadFontAsync(font);
let n = 0;
for (const { f, T } of screens()) {
  const btn = f.children[0] && f.children[0].findOne(x => x.name === 'Button - Ustawienia'); if (!btn) continue;
  [...btn.children].forEach(c => c.remove());
  const t = figma.createText(); t.fontName = font; t.fontSize = 28; t.lineHeight = { unit: 'PIXELS', value: 28 }; t.characters = 'settings'; t.name = 'settings'; t.fills = solid(T.ink);
  btn.appendChild(t); n++;
}
const h = sections[0].children.find(x => x.name.startsWith('01 ')).children[0];
await shot(h, { name: 'v-hdr', scale: 2 });
return { changed: n };
