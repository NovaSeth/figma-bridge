// Wspólna biblioteka zadań DS: strona, zmienne, style, pomocnicze konstruktory.
let dsPage = figma.root.children.find(p => p.name === 'Design System');
if (!dsPage) { dsPage = figma.createPage(); dsPage.name = 'Design System'; }
await figma.setCurrentPageAsync(dsPage);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const MI = { family: 'Material Icons', style: 'Regular' }; await figma.loadFontAsync(MI);
const _cols = await figma.variables.getLocalVariableCollectionsAsync(), _vars = await figma.variables.getLocalVariablesAsync();
const colId = n => _cols.find(c => c.name === n).id;
const V = (name, collection) => _vars.find(v => v.name === name && v.variableCollectionId === colId(collection || (name.startsWith('color/') ? 'Color' : 'Size')));
const paint = (name, collection) => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V('color/' + name, collection))];
const _ts = await figma.getLocalTextStylesAsync(), _es = await figma.getLocalEffectStylesAsync();
const TS = n => _ts.find(s => s.name === n), ES = n => _es.find(s => s.name === n);
const txt = async (chars, style, color, collection) => { const t = figma.createText(); await t.setTextStyleIdAsync(TS(style).id); t.characters = chars; t.fills = paint(color || 'on-surface', collection); return t; };
const box = (name, dir, o = {}) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  for (const [k, v] of Object.entries(o)) { if (k === 'gap') f.setBoundVariable('itemSpacing', V('spacing/' + v)); else if (k === 'pad') { const [y, x] = v; for (const s of ['paddingTop', 'paddingBottom']) f.setBoundVariable(s, V('spacing/' + y)); for (const s of ['paddingLeft', 'paddingRight']) f.setBoundVariable(s, V('spacing/' + x)); } else if (k === 'radius') { for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) f.setBoundVariable(c, V('radius/' + v)); } else if (k === 'fill') f.fills = paint(v); else f[k] = v; }
  return f; };
const fillW = n => { n.layoutSizingHorizontal = 'FILL'; return n; };
const section = name => dsPage.children.find(n => n.type === 'SECTION' && n.name === name);
//# DS P2: strona Design System i dokumentacja fundamentów
if (section('Fundamenty')) return { skipped: 'Fundamenty już istnieją' };
const sec = figma.createSection(); sec.name = 'Fundamenty'; dsPage.appendChild(sec); sec.x = 0; sec.y = 0;
const root = box('Foundations', 'VERTICAL', { gap: '3xl', pad: ['3xl', '3xl'], fill: 'background' }); sec.appendChild(root); root.x = 80; root.y = 80; root.counterAxisSizingMode = 'FIXED'; root.resize(1680, 100); root.primaryAxisSizingMode = 'AUTO';
const head = box('Intro', 'VERTICAL', { gap: 'sm' }); root.appendChild(head); fillW(head);
head.appendChild(await txt('FLibrus Design System', 'headline-lg'));
const intro = await txt('Źródło prawdy dla makiet na stronie „Mockupy”. Zbudowany atomowo: tokeny → atomy → molekuły → organizmy. Nazwy tokenów są zgodne z formatem DESIGN.md (Stitch), więc ten plik da się wyeksportować do DESIGN.md dla agentów kodujących. Motyw ciemny to osobna kolekcja „Color Dark” o tych samych nazwach (plan Starter pozwala na jeden tryb w kolekcji).', 'body-md', 'on-surface-variant'); head.appendChild(intro); fillW(intro); intro.textAutoResize = 'HEIGHT';
progress(0.15, 'Kolory');
const colorBlock = async (title, collection) => {
  const wrap = box(title, 'VERTICAL', { gap: 'lg' }); root.appendChild(wrap); fillW(wrap); wrap.appendChild(await txt(title, 'title-lg'));
  const grid = box('Swatches', 'HORIZONTAL', { gap: 'lg', layoutWrap: 'WRAP' }); grid.counterAxisSpacing = 16; wrap.appendChild(grid); fillW(grid);
  for (const v of _vars.filter(x => x.variableCollectionId === colId(collection)).sort((a, b) => a.name.localeCompare(b.name))) {
    const cell = box('Swatch ' + v.name, 'VERTICAL', { gap: 'xs' }); cell.counterAxisSizingMode = 'FIXED'; cell.resize(190, 10); cell.primaryAxisSizingMode = 'AUTO';
    const chip = figma.createFrame(); chip.name = 'Color'; chip.resize(190, 72); chip.cornerRadius = 12; chip.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)];
    chip.strokes = paint('outline-variant'); chip.strokeWeight = 1; cell.appendChild(chip);
    cell.appendChild(await txt(v.name.replace('color/', ''), 'label-md'));
    const alias = v.valuesByMode[Object.keys(v.valuesByMode)[0]]; const p = alias && alias.id ? await figma.variables.getVariableByIdAsync(alias.id) : null;
    const pv = p ? p.valuesByMode[Object.keys(p.valuesByMode)[0]] : null; const hx = pv ? '#' + [pv.r, pv.g, pv.b].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase() : '';
    cell.appendChild(await txt((p ? p.name + '  ' : '') + hx, 'caption', 'on-surface-variant'));
    grid.appendChild(cell);
  }
};
await colorBlock('Kolor: motyw jasny (kolekcja Color)', 'Color');
await colorBlock('Kolor: motyw ciemny (kolekcja Color Dark)', 'Color Dark');
progress(0.55, 'Typografia');
const type = box('Typografia', 'VERTICAL', { gap: 'md' }); root.appendChild(type); fillW(type); type.appendChild(await txt('Typografia: Inter', 'title-lg'));
for (const s of _ts) { const r = box('Type ' + s.name, 'HORIZONTAL', { gap: '2xl', counterAxisAlignItems: 'CENTER' }); type.appendChild(r);
  const lab = await txt(s.name + '  ·  ' + s.fontName.style + ' ' + s.fontSize + '/' + Math.round(s.lineHeight.value) + '%', 'label-md', 'on-surface-variant'); r.appendChild(lab); lab.resize(300, lab.height); lab.textAutoResize = 'HEIGHT';
  r.appendChild(await txt(s.description || 'Przykład', s.name)); }
progress(0.75, 'Odstępy, promienie, cienie');
const nums = box('Skale', 'HORIZONTAL', { gap: '3xl' }); root.appendChild(nums); fillW(nums);
const scale = async (title, group, draw) => { const c = box(title, 'VERTICAL', { gap: 'sm' }); nums.appendChild(c); c.appendChild(await txt(title, 'title-lg'));
  for (const v of _vars.filter(x => x.name.startsWith(group + '/')).sort((a, b) => a.valuesByMode[Object.keys(a.valuesByMode)[0]] - b.valuesByMode[Object.keys(b.valuesByMode)[0]])) { const val = v.valuesByMode[Object.keys(v.valuesByMode)[0]]; const r = box(v.name, 'HORIZONTAL', { gap: 'md', counterAxisAlignItems: 'CENTER' }); c.appendChild(r); const l = await txt(v.name + ' = ' + val, 'label-md', 'on-surface-variant'); r.appendChild(l); l.resize(170, l.height); r.appendChild(draw(v, val)); } };
await scale('Odstępy', 'spacing', (v, val) => { const b = figma.createFrame(); b.resize(Math.max(val, 2), 16); b.cornerRadius = 3; b.fills = paint('primary'); b.setBoundVariable('width', v); return b; });
await scale('Promienie', 'radius', (v, val) => { const b = figma.createFrame(); b.resize(72, 48); b.fills = paint('primary-container'); for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) b.setBoundVariable(c, v); return b; });
const el = box('Cienie', 'VERTICAL', { gap: 'lg' }); nums.appendChild(el); el.appendChild(await txt('Cienie (tylko elementy pływające)', 'title-lg'));
for (const s of _es) { const r = box(s.name, 'HORIZONTAL', { gap: 'lg', counterAxisAlignItems: 'CENTER', pad: ['md', 'md'] }); el.appendChild(r); const c = figma.createFrame(); c.resize(120, 64); c.cornerRadius = 20; c.fills = paint('surface'); await c.setEffectStyleIdAsync(s.id); r.appendChild(c); r.appendChild(await txt(s.name, 'label-md', 'on-surface-variant')); }
sec.resizeWithoutConstraints(root.width + 160, root.height + 160);
await shot(root, { name: 'ds-foundations', scale: 0.4 });
return { sectionId: sec.id, rootId: root.id, size: [Math.round(root.width), Math.round(root.height)], pages: figma.root.children.map(p => p.name) };
