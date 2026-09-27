const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const section of page.children.filter(n => n.type === 'SECTION')) {
  for (const f of section.children.filter(n => n.type === 'FRAME')) {
    const t = f.findAllWithCriteria({ types: ['TEXT'] });
    const has = s => t.some(x => x.characters === s);
    out.push([section.name[0], f.id, f.name.slice(0, 34), Math.round(f.height), 'y' + Math.round(f.y),
      has('expand_more') ? 'chev' : 'NOCHEV', f.findOne(n => n.name === 'Avatar badge') ? 'badge' : 'NOBADGE',
      f.findOne(n => n.name.startsWith('Button - Odśwież')) ? 'REFRESH-ICON' : '', has('chat') ? 'CHAT-ICON' : '', has('Szkoła') ? 'SZKOLA-OLD' : '',
      f.findOne(n => n.name === 'Bottom sheet') ? 'sheet' : ''].filter(Boolean).join(' '));
  }
}
const get = async id => figma.getNodeByIdAsync(id);
await shot(await get('3:2'), { name: 'audit-01' });
await shot(await get('5:2'), { name: 'audit-02', scale: 2 });
await shot(await get('28:2'), { name: 'audit-01-dark' });
await shot(await get('22:2'), { name: 'audit-19' });
return out;
