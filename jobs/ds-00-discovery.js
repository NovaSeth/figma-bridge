//# DS P0: inwentaryzacja pliku i limitów planu
const out = { pages: figma.root.children.map(p => p.name) };
const cols = await figma.variables.getLocalVariableCollectionsAsync();
out.collections = cols.map(c => ({ name: c.name, vars: c.variableIds.length, modes: c.modes.length }));
out.textStyles = (await figma.getLocalTextStylesAsync()).length;
out.effectStyles = (await figma.getLocalEffectStylesAsync()).length;
out.paintStyles = (await figma.getLocalPaintStylesAsync()).length;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
out.components = page.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).length;
// limit trybów: próba na tymczasowej kolekcji, sprzątana od razu
const tmp = figma.variables.createVariableCollection('__probe__');
try { tmp.addMode('Dark'); out.modesLimit = 'ok: >1 tryb dostępny'; } catch (e) { out.modesLimit = 'limit: ' + e.message; }
tmp.remove();
// limit stron: tylko odczyt liczby, bez tworzenia
const fonts = await figma.listAvailableFontsAsync();
out.inter = fonts.filter(f => f.fontName.family === 'Inter').map(f => f.fontName.style).join(', ');
out.material = [...new Set(fonts.filter(f => f.fontName.family.startsWith('Material Symbols')).map(f => f.fontName.family + ' / ' + f.fontName.style))].slice(0, 8);
return out;
