//# Kontrola: czy banery i inne instancje nie ucierpiały po sprzątaniu
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Banner');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
let broken = 0, banners = 0; const sample = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const i of f.findAllWithCriteria({ types: ['INSTANCE'] })) { const mc = await i.getMainComponentAsync();
    if (!mc || mc.removed) { broken++; if (sample.length < 6) sample.push(f.name.slice(0, 14) + '/' + i.name); }
    if (i.name === 'Banner') banners++; } }
return { setVariants: set ? set.children.map(c => c.name) : 'brak', banners, broken, sample };
