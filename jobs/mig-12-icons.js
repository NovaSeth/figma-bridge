//# Migracja M2a: ikony jako instancje komponentów Icon/*
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
// brakujące style
const styles = await figma.getLocalTextStylesAsync();
for (const [name, style, size, lh, desc] of [['display/sm', 'Extra Bold', 40, 110, 'Wskaźnik na karcie KPI (frekwencja)'], ['calendar/day-num', 'Medium', 12, 130, 'Numer dnia w siatce miesiąca']]) { await figma.loadFontAsync({ family: 'Inter', style }); const s = styles.find(x => x.name === name) || figma.createTextStyle(); s.name = name; s.fontName = { family: 'Inter', style }; s.fontSize = size; s.lineHeight = { unit: 'PERCENT', value: lh }; s.letterSpacing = { unit: 'PERCENT', value: 0 }; s.description = desc; }
const ICONS = {}; for (const c of ds.findAllWithCriteria({ types: ['COMPONENT'] })) if (c.name.startsWith('Icon/')) ICONS[c.name.slice(5)] = c;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const styles2 = await figma.getLocalTextStylesAsync();
const replace = (old, inst) => { const parent = old.parent, idx = parent.children.indexOf(old); parent.insertChild(idx, inst);
  if (old.layoutPositioning === 'ABSOLUTE') { inst.layoutPositioning = 'ABSOLUTE'; inst.x = old.x; inst.y = old.y; }
  else if (parent.layoutMode && parent.layoutMode !== 'NONE') { try { inst.layoutGrow = old.layoutGrow; } catch (e) {} try { inst.layoutAlign = old.layoutAlign; } catch (e) {} }
  else { inst.x = old.x; inst.y = old.y; }
  try { inst.constraints = old.constraints; } catch (e) {}
  old.remove(); };
const stat = { icons: 0, missing: {}, text: 0 };
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) {
  for (const t of f.findAll(x => x.type === 'TEXT' && x.fontName !== figma.mixed && x.fontName.family.startsWith('Material'))) {
    const comp = ICONS[t.characters]; if (!comp) { stat.missing[t.characters] = (stat.missing[t.characters] || 0) + 1; continue; }
    const size = Math.max(12, Math.round(t.fontSize)); const inst = comp.createInstance(); inst.name = 'Icon/' + t.characters; inst.resize(size, size);
    const fill = Array.isArray(t.fills) && t.fills[0]; if (fill) inst.children[0].fills = [fill];
    replace(t, inst); stat.icons++;
  }
  for (const t of f.findAll(x => x.type === 'TEXT' && !x.textStyleId && x.fontName !== figma.mixed && x.fontName.family === 'Inter')) {
    const lh = t.lineHeight.unit === 'PERCENT' ? t.lineHeight.value : t.lineHeight.unit === 'PIXELS' ? t.lineHeight.value / t.fontSize * 100 : 140;
    const c = styles2.filter(x => x.fontName.style === t.fontName.style).map(x => ({ x, d: Math.abs(x.fontSize - t.fontSize) * 10 + Math.abs(x.lineHeight.value - lh) * 0.35 })).sort((a, b) => a.d - b.d)[0];
    if (c && c.d <= 40) { await figma.loadFontAsync(c.x.fontName); await t.setTextStyleIdAsync(c.x.id); stat.text++; }
  }
  progress((fi + 1) / s.children.length, s.name[0] + ' ' + f.name.slice(0, 18));
}
return { icons: stat.icons, text: stat.text, missing: Object.entries(stat.missing) };
