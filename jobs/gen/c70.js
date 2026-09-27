//# #70: nadtytuł w arkuszu nie wnosi informacji → wyłączony
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const hdr = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'Sheet header');
let def = null;
if (hdr) { const k = Object.keys(hdr.componentPropertyDefinitions).find(x => x.startsWith('Show kicker'));
  if (k) { hdr.editComponentProperty(k, { defaultValue: false }); def = 'Show kicker → false'; }
  if (!/nadtytuł/.test(hdr.description)) hdr.description += ' Nadtytuł zostaje wyłączony: rodzaj treści wynika z chipów i tytułu, więc nie powtarzamy go w nagłówku arkusza.'; }
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
let off = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const i of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Sheet header')) { const k = Object.keys(i.componentProperties).find(x => x.startsWith('Show kicker'));
    if (k && i.componentProperties[k].value) { try { i.setProperties({ [k]: false }); off++; } catch (e) {} } }
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); if (sheet) sheet.y = f.height - sheet.height;
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('02 '), { name: 'c-70', scale: 0.5 });
return { def, off };
