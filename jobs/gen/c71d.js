//# #71: lista w arkuszu — najpierw odczyt treści, potem podmiana
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const feed = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Feed row');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); } catch (e) {} } };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); if (!sheet) continue;
  const list = sheet.findOne(n => n.type === 'FRAME' && n.name === 'List' && n.children.length); if (!list) continue;
  // 1) odczyt treści wszystkich wierszy do zamiany
  const plan = [];
  for (const row of list.children.filter(c => c.type !== 'RECTANGLE' && !(c.type === 'INSTANCE' && c.name === 'Feed row'))) {
    const ts = T(row).map(t => ({ s: t.characters, size: t.fontSize }));
    const title = ts.find(t => t.size >= 16) || ts[0]; if (!title) continue;
    const when = ts.find(t => t.size <= 13 && t.s.length <= 8 && t !== title);
    const sub = ts.find(t => t !== title && t !== when && t.size === 15);
    const prev = ts.filter(t => ![title, when, sub].includes(t)).sort((a, b) => b.s.length - a.s.length)[0];
    plan.push({ id: row.id, title: title.s, when: when && when.s, sub: sub && sub.s, prev: prev && prev.s, att: ts.some(t => /Załącznik/.test(t.s)) });
  }
  // 2) podmiana
  for (const p of plan) {
    const row = await figma.getNodeByIdAsync(p.id); if (!row || row.removed) continue;
    const i = feed.children.find(v => v.name === 'Leading=Avatar, Read=True').createInstance();
    setP(i, 'Title', p.title); setP(i, 'Show when', false);
    setP(i, 'Show subtitle', !!p.sub); if (p.sub) setP(i, 'Subtitle', p.sub);
    setP(i, 'Show preview', !!p.prev); if (p.prev) setP(i, 'Preview', p.prev);
    const dst = i.findOne(n => n.name === 'Chips top').children.filter(c => c.type === 'INSTANCE');
    const chips = [p.when && { label: p.when }, p.att && { label: 'Załącznik' }].filter(Boolean);
    chips.forEach((c, idx) => { const t = dst[idx]; if (!t) return; setP(t, 'Label', c.label); setP(t, 'Show icon', true); });
    setP(i, 'Show chips top', chips.length > 0); for (let k = 2; k <= dst.length; k++) setP(i, 'Show chip top ' + k, k <= chips.length);
    setP(i, 'Show chips', false);
    const av = i.findOne(n => n.type === 'INSTANCE' && n.name === 'Avatar'); if (av) setP(av, 'Initials', 'JO');
    list.insertChild(list.children.indexOf(row), i); try { i.layoutSizingHorizontal = 'FILL'; } catch (e) {}
    row.remove(); out.push(f.name.slice(0, 12) + ' → ' + p.title.slice(0, 22));
  }
  sheet.y = f.height - sheet.height;
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('02a'), { name: 'c-71b', scale: 0.5 });
return out;
