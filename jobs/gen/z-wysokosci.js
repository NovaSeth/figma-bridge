//# opis: wysokosci wszystkich ramek
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = {};
for (const sec of page.children.filter(c => c.type === 'SECTION')) for (const f of sec.children.filter(c => c.type === 'FRAME')) out[sec.name + '|' + f.name] = Math.round(f.height);
return out;
