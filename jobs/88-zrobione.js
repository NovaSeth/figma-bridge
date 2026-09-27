//# #46: „Ogarnięte" → „Zrobione" w makietach i w design systemie
const fix = s => s.replace(/Ogarnięte/g, 'Zrobione').replace(/ogarnięte/g, 'zrobione').replace(/Ogarnięta/g, 'Zrobiona').replace(/ogarnięcia/g, 'zrobienia');
const out = {};
for (const pageName of ['[Mobile] User Front', 'Design System']) {
  const page = figma.root.children.find(p => p.name === pageName); await page.loadAsync();
  let n = 0;
  for (const t of page.findAllWithCriteria({ types: ['TEXT'] })) { if (!/ogarni/i.test(t.characters)) continue; if (t.fontName === figma.mixed) { for (const seg of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(seg.fontName); } else await figma.loadFontAsync(t.fontName); t.characters = fix(t.characters); n++; }
  let d = 0;
  for (const c of page.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) { if (/ogarni/i.test(c.description)) { c.description = fix(c.description); d++; }
    if (c.type === 'COMPONENT_SET' || c.parent.type !== 'COMPONENT_SET') { const defs = c.componentPropertyDefinitions; for (const [k, def] of Object.entries(defs)) if (def.type === 'TEXT' && /ogarni/i.test(def.defaultValue)) { c.editComponentProperty(k, { defaultValue: fix(def.defaultValue) }); d++; } } }
  for (const node of page.findAll(x => /ogarni/i.test(x.name))) node.name = fix(node.name);
  out[pageName] = { texts: n, descriptionsAndDefaults: d, left: page.findAllWithCriteria({ types: ['TEXT'] }).filter(t => /ogarni/i.test(t.characters)).length };
}
return out;
