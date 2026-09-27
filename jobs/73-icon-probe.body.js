//# #34: porównanie odmian ikony ustawień
const T = THEMES['Jasny motyw'];
const row = al('probe', 'HORIZONTAL', { itemSpacing: 24, paddingTop: 12, paddingBottom: 12, paddingLeft: 12, paddingRight: 12 }); row.fills = solid(T.bg);
for (const style of ['Regular', 'Light', 'ExtraLight', 'Thin']) { const font = { family: 'Material Symbols Rounded', style }; await figma.loadFontAsync(font); const t = figma.createText(); t.fontName = font; t.fontSize = 28; t.characters = 'settings'; t.fills = solid(T.ink); row.appendChild(t); }
page.appendChild(row); row.x = -2000; row.y = -2000;
await shot(row, { name: 'v-probe', scale: 3 });
row.remove();
return 'ok';
