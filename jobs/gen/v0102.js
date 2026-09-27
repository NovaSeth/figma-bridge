//# Weryfikacja 01 i 02 po poprawkach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('01 '), { name: 'v-01', scale: 0.42 }); await shot(get('02 '), { name: 'v-02', scale: 0.5 });
const f = get('01 '); const hdr = f.children[0];
return { top: hdr.name + ' ' + Math.round(hdr.height) + ' ' + hdr.type, children: f.children.map(c => c.type[0] + ':' + c.name.slice(0, 18) + '@' + Math.round(c.y)) };
