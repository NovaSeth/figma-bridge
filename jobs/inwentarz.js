// Inwentaryzacja: sekcje, ekrany w rzędach, komponenty DS. Tylko odczyt.
const pages = figma.root.children.map(p => p.name);
const front = figma.root.children.find(p => p.name.includes('User Front'))
           || figma.root.children.find(p => p.name.includes('Mockup'));
const ds = figma.root.children.find(p => p.name.includes('Design System'));

const out = { pages, sections: [], components: [], dsPage: ds ? ds.name : null };

if (front) {
  await front.loadAsync();
  for (const node of front.children) {
    if (node.type !== 'SECTION') continue;
    const screens = node.children
      .filter(c => c.type === 'FRAME')
      .map(c => ({ name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    out.sections.push({ name: node.name, count: screens.length, screens });
  }
}

if (ds) {
  await ds.loadAsync();
  const sets = [];
  const walk = (n) => {
    if (n.type === 'COMPONENT_SET') { sets.push({ name: n.name, variants: n.children.length, props: Object.keys(n.componentPropertyDefinitions || {}) }); return; }
    if (n.type === 'COMPONENT') { sets.push({ name: n.name, variants: 1, props: Object.keys(n.componentPropertyDefinitions || {}) }); return; }
    if ('children' in n) n.children.forEach(walk);
  };
  ds.children.forEach(walk);
  out.components = sets;
}
return out;
