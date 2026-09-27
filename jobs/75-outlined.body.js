//# Ikonografia: Material Symbols Outlined na wszystkich ekranach
const fonts = await figma.listAvailableFontsAsync();
const outlined = fonts.filter(x => x.fontName.family === 'Material Symbols Outlined').map(x => x.fontName.style);
if (!outlined.length) return { error: 'brak fontu Material Symbols Outlined', families: [...new Set(fonts.map(x => x.fontName.family).filter(n => n.startsWith('Material')))] };
for (const style of outlined) await figma.loadFontAsync({ family: 'Material Symbols Outlined', style });
let n = 0; const errors = [];
const all = [...screens().map(s => s.f), ...page.children.filter(c => c.type === 'FRAME')];
for (const f of all) for (const t of f.findAll(isIcon)) { try {
  if (t.fontName.family === 'Material Symbols Outlined') continue;
  await figma.loadFontAsync(t.fontName);
  const style = outlined.includes(t.fontName.style) ? t.fontName.style : 'Regular';
  t.fontName = { family: 'Material Symbols Outlined', style: t.name === 'settings' ? 'Light' : style }; n++;
} catch (e) { errors.push(f.name.slice(0, 20) + ': ' + e.message); } }
const f01 = sections[0].children.find(x => x.name.startsWith('01 '));
await shot(f01.children[0], { name: 'v-hdr', scale: 2 });
await shot(f01.children[f01.children.length - 1], { name: 'v-nav', scale: 2 });
return { changed: n, styles: outlined, errors: errors.slice(0, 5) };
