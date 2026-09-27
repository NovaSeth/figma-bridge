//# Zrzuty końcowe design systemu
const page = figma.root.children.find(p => p.name === 'Design System'); await figma.setCurrentPageAsync(page);
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) { const b = s.children.find(n => n.name === 'Board' || n.name === 'Start board' || n.name === 'Foundations'); if (b) { await shot(b, { name: 'ds-' + s.name.toLowerCase().replace(/\s+/g, '-'), scale: s.name === 'Fundamenty' ? 0.3 : 0.42 }); out.push(s.name + ' ' + Math.round(b.width) + 'x' + Math.round(b.height)); } }
const comps = page.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).filter(c => c.parent.type !== 'COMPONENT_SET');
return { sections: out, components: comps.length, icons: comps.filter(c => c.name.startsWith('Icon/')).length, sets: comps.filter(c => c.type === 'COMPONENT_SET').length };
