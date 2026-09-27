//# Zrzuty ekranów (after) 33–40
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const frames = page.children.filter(n => n.type === 'SECTION').flatMap(s => s.children.filter(n => n.type === 'FRAME').sort((a, b) => a.y - b.y || a.x - b.x).map(f => ({ f, t: s.name[0] })));
const part = frames.slice(32, 40); let i = 0;
for (const { f, t } of part) { await shot(f, { name: 'snap__' + t + '_' + f.name.split(' ')[0].replace(/[^0-9a-z]/gi, ''), scale: 1 }); progress(++i / part.length); }
return { total: frames.length, done: part.length };