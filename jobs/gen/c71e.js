//# Naprawa arkusza zdjęcia: opcje jako zwykłe wiersze listy
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const lr = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); } catch (e) {} } };
const getP = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME' && n.name.startsWith('02e'))) {
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); const list = sheet && sheet.findOne(n => n.type === 'FRAME' && n.name === 'List'); if (!list) continue;
  const plan = list.children.filter(c => c.type === 'INSTANCE' && c.name === 'Feed row').map(c => ({ id: c.id, title: getP(c, 'Title') }));
  for (const p of plan) { const row = await figma.getNodeByIdAsync(p.id); if (!row || row.removed) continue;
    const i = lr.children.find(v => v.name === 'Leading=None, Trailing=Chevron').createInstance();
    setP(i, 'Title', p.title); setP(i, 'Show subtitle', false); setP(i, 'Show chips', false); setP(i, 'Show chips top', false);
    list.insertChild(list.children.indexOf(row), i); try { i.layoutSizingHorizontal = 'FILL'; } catch (e) {}
    row.remove(); out.push('02e → ' + String(p.title).slice(0, 26)); }
  sheet.y = f.height - sheet.height;
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('02e'), { name: 'c-71e', scale: 0.5 }); await shot(get('02a'), { name: 'c-71b', scale: 0.5 });
return out;
