//# DS P4: audyt i odczyt tokenów do eksportu DESIGN.md
const page = figma.root.children.find(p => p.name === 'Design System'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(), vars = await figma.variables.getLocalVariablesAsync();
const byId = Object.fromEntries(vars.map(v => [v.id, v]));
const resolve = v => { let val = v.valuesByMode[Object.keys(v.valuesByMode)[0]]; while (val && val.type === 'VARIABLE_ALIAS') { v = byId[val.id]; val = v.valuesByMode[Object.keys(v.valuesByMode)[0]]; } return val; };
const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const col = n => cols.find(c => c.name === n).id;
const pick = (collection, prefix) => Object.fromEntries(vars.filter(v => v.variableCollectionId === col(collection) && v.name.startsWith(prefix)).map(v => [v.name.slice(prefix.length), { value: typeof resolve(v) === 'object' ? hex(resolve(v)) : resolve(v), description: v.description, css: v.codeSyntax && v.codeSyntax.WEB }]));
const out = { colors: pick('Color', 'color/'), colorsDark: pick('Color Dark', 'color/'), spacing: pick('Size', 'spacing/'), rounded: pick('Size', 'radius/'), size: pick('Size', 'size/') };
out.typography = (await figma.getLocalTextStylesAsync()).map(s => ({ name: s.name, fontFamily: s.fontName.family, style: s.fontName.style, fontSize: s.fontSize, lineHeight: s.lineHeight.value, letterSpacing: s.letterSpacing.value, description: s.description }));
out.elevation = (await figma.getLocalEffectStylesAsync()).map(s => ({ name: s.name, layers: s.effects.map(e => ({ x: e.offset.x, y: e.offset.y, blur: e.radius, alpha: Math.round(e.color.a * 100) / 100 })) }));
const comps = page.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).filter(c => c.parent.type !== 'COMPONENT_SET');
out.components = comps.filter(c => !c.name.startsWith('Icon/')).map(c => ({ name: c.name, type: c.type, variants: c.type === 'COMPONENT_SET' ? c.children.map(v => v.name) : [], properties: Object.keys(c.componentPropertyDefinitions || {}).map(k => k.split('#')[0]), description: c.description }));
out.icons = comps.filter(c => c.name.startsWith('Icon/')).map(c => c.name.slice(5));
// audyt: niezwiązane wypełnienia i obrysy w komponentach, duplikaty nazw
const unbound = [];
for (const c of comps) for (const n of [c, ...c.findAll(() => true)]) { if (n.type === 'INSTANCE' || (n.parent && n.parent.type === 'INSTANCE')) continue; let p = n.parent, inInst = false; while (p && p !== c) { if (p.type === 'INSTANCE') { inInst = true; break; } p = p.parent; } if (inInst) continue;
  for (const key of ['fills', 'strokes']) { const arr = n[key]; if (!Array.isArray(arr)) continue; arr.forEach((paint, i) => { if (paint.type === 'SOLID' && paint.visible !== false && !(paint.boundVariables && paint.boundVariables.color)) unbound.push(c.name + ' › ' + n.name + ' (' + key + ')'); }); } }
out.audit = { components: comps.length, unbound: [...new Set(unbound)].slice(0, 30), unboundCount: unbound.length, duplicateNames: comps.map(c => c.name).filter((n, i, a) => a.indexOf(n) !== i) };
return out;
