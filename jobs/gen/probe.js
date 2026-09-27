//# Diagnostyka pól i bloków kalendarza
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const frames = page.children.flatMap(s => s.type === 'SECTION' ? s.children.filter(n => n.type === 'FRAME') : []);
const get = p => frames.find(n => n.name.startsWith(p));
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const f13 = get('13 '), f15 = get('15 ');
const inputs = f13.findAll(x => x.type === 'FRAME' && x.name === 'Input').map(n => ({ parent: n.parent.name, parentType: n.parent.type, kids: n.parent.children.map(c => c.type[0] + ':' + c.name), h: Math.round(n.height) }));
const vars = await figma.variables.getLocalVariablesAsync(); const vn = id => { const v = vars.find(x => x.id === id); return v ? v.name.replace('color/', '') : null; };
const tok = n => { const f = Array.isArray(n.fills) && n.fills.find(p => p.type === 'SOLID' && p.visible !== false); return f && f.boundVariables && f.boundVariables.color ? vn(f.boundVariables.color.id) : null; };
const blocks = f15.findAll(x => x.type === 'FRAME' && tok(x) === 'primary-container').slice(0, 6).map(n => ({ name: n.name, pos: n.layoutPositioning, w: Math.round(n.width), h: Math.round(n.height), texts: T(n).length, parent: n.parent.name, parentLayout: n.parent.layoutMode }));
return { inputs, blocks };
