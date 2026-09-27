//# opis: przygotowanie do przebudowy Frekwencji
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = light.children.find(x => x.name === '02f Teraz · frekwencja');
const main = f.children.find(c => c.name === 'Main Content');
const vars = await figma.variables.getLocalVariablesAsync();
const colors = vars.filter(v => v.resolvedType === 'COLOR').map(v => v.name);
const sizes = vars.filter(v => v.resolvedType === 'FLOAT').map(v => v.name);
const styles = (await figma.getLocalTextStylesAsync()).map(s => s.name);
return {
  main: main.children.map(c => ({ n: c.name, t: c.type, y: Math.round(c.y), h: Math.round(c.height), kids: 'children' in c ? c.children.length : 0 })),
  frameH: Math.round(f.height),
  colors: [...new Set(colors)],
  sizes: [...new Set(sizes)].slice(0, 40),
  styles
};
