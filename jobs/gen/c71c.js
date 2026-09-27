//# #71: lista „Poprzednie wiadomości" w arkuszu 02a
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const feed = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Feed row');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); return true; } catch (e) {} } return false; };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); if (!sheet) continue;
  const list = sheet.findOne(n => n.type === 'FRAME' && n.name === 'List' && n.children.length);
  if (!list) continue;
  out.push(f.name.slice(0, 14) + ': ' + list.children.map(c => c.type[0] + ':' + c.name.slice(0, 12)).join(', '));
  const rowIds = list.children.filter(c => c.type !== 'RECTANGLE').map(c => c.id);
  for (const rid of rowIds) { const row = await figma.getNodeByIdAsync(rid); if (!row || row.removed) continue;
    if (row.type === 'INSTANCE' && row.name === 'Feed row') continue;
    const ts = T(row); const title = ts.find(t => t.fontSize >= 16) || ts[0]; if (!title) continue;
    const when = ts.find(t => t.fontSize <= 13 && t.characters.length <= 8 && t !== title);
    const sub = ts.find(t => t !== title && t !== when && t.fontSize === 15);
    const prev = ts.filter(t => ![title, when, sub].includes(t)).sort((a, b) => b.characters.length - a.characters.length)[0];
    const att = ts.some(t => /Załącznik/.test(t.characters));
    const i = feed.children.find(v => v.name === 'Leading=Avatar, Read=True').createInstance();
    setP(i, 'Title', title.characters); setP(i, 'Show when', false);
    setP(i, 'Show subtitle', !!sub); if (sub) setP(i, 'Subtitle', sub.characters);
    setP(i, 'Show preview', !!prev); if (prev) setP(i, 'Preview', prev.characters);
    const top = i.findOne(n => n.name === 'Chips top'); const dst = top.children.filter(c => c.type === 'INSTANCE');
    const chips = [when ? { label: when.characters, icon: true } : null, att ? { label: 'Załącznik', icon: true, attach: true } : null].filter(Boolean);
    chips.forEach((c, idx) => { const t = dst[idx]; if (!t) return; setP(t, 'Label', c.label); setP(t, 'Show icon', true); });
    setP(i, 'Show chips top', chips.length > 0); for (let k2 = 2; k2 <= dst.length; k2++) setP(i, 'Show chip top ' + k2, k2 <= chips.length);
    setP(i, 'Show chips', false);
    const av = i.findOne(n => n.type === 'INSTANCE' && n.name === 'Avatar'); if (av) setP(av, 'Initials', 'JO');
    const idx2 = list.children.indexOf(row); list.insertChild(idx2, i); try { i.layoutSizingHorizontal = 'FILL'; } catch (e) {}
    row.remove(); out.push('  → podmieniono wiersz: ' + title.characters.slice(0, 20));
  }
  const body = sheet.findOne(n => n.name === 'Body'); if (body) { sheet.y = f.height - sheet.height; }
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('02a'), { name: 'c-71b', scale: 0.5 });
return out.slice(0, 14);
