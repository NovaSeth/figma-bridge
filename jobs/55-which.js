//# Kontekst komentarza #41
const n = await figma.getNodeByIdAsync('47:2706');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const g = page.findOne(x => x.type === 'FRAME' && x.name.startsWith('02g'));
return { pinned: n && n.name, settings: g && { id: g.id, children: g.children.map(c => c.name), mainKids: g.children[1].children.map(c => c.name).slice(0, 4) } };
