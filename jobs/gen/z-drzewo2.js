//# opis: drzewo wskazanego wezla po sciezce nazw
const NAZWA = __NAZWA__; const SEKCJA = __SEKCJA__; const GLEB = __GLEB__; const SCIEZKA = __SCIEZKA__;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(c => c.type === 'SECTION' && c.name === SEKCJA);
let f = sec.children.find(c => c.name === NAZWA);
for (const krok of SCIEZKA) f = typeof krok === 'number' ? f.children[krok] : f.children.find(c => c.name === krok);
const opisz = async (n, d) => {
  const o = { n: n.name, t: n.type, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) };
  if ('layoutMode' in n && n.layoutMode !== 'NONE') o.lay = n.layoutMode + ' pad=' + [n.paddingLeft, n.paddingTop, n.paddingRight, n.paddingBottom].join(',') + ' sp=' + n.itemSpacing + ' prim=' + n.primaryAxisSizingMode + '/' + n.primaryAxisAlignItems + ' cnt=' + n.counterAxisSizingMode + '/' + n.counterAxisAlignItems;
  if ('layoutAlign' in n) o.la = n.layoutAlign + '/g' + n.layoutGrow + (n.layoutPositioning === 'ABSOLUTE' ? '/ABS' : '');
  if (n.type === 'TEXT') { o.txt = n.characters; o.deco = n.textDecoration; }
  if (n.type === 'INSTANCE') { const mc = await n.getMainComponentAsync(); o.komp = mc ? mc.name : '?'; o.props = Object.fromEntries(Object.entries(n.componentProperties || {}).map(([k, v]) => [k.split('#')[0], v.type === 'INSTANCE_SWAP' ? 'swap' : v.value])); }
  if (!n.visible) o.hidden = true;
  if ('fills' in n && n.fills !== figma.mixed && n.fills.length) o.fill = (n.boundVariables && n.boundVariables.fills || []).map(v => v.id).join(',') || JSON.stringify(n.fills.map(x=>x.color||x.type));
  if ('strokes' in n && n.strokes.length) o.stroke = ((n.boundVariables && n.boundVariables.strokes || []).map(v => v.id).join(',') || 'wprost') + ' w=' + (n.strokeWeight === figma.mixed ? 'mixed' : n.strokeWeight) + (n.dashPattern && n.dashPattern.length ? ' dash=' + n.dashPattern.join(',') : '');
  if (d > 0 && 'children' in n) { o.kids = []; for (const c of n.children) o.kids.push(await opisz(c, d - 1)); }
  return o;
};
return await opisz(f, GLEB);
