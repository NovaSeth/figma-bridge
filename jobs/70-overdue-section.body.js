//# #33: „Po terminie" jako osobna sekcja pod „Wymaga Twojego działania"
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
for (const { f, T } of screens()) { try {
  const main = f.children[1]; if (!main || main.name !== 'Main Content') continue;
  const h = texts(main).find(t => t.characters === 'Wymaga Twojego działania' && t.fontSize === 20); if (!h) continue;
  const section = h.parent.parent, list = section.children.find(c => c.name === 'List');
  if (!list || !list.children.some(c => c.name === 'Group heading')) continue;
  let wrap = section; while (wrap.parent !== main) wrap = wrap.parent;
  const isOverdue = c => c.type === 'FRAME' && c.name !== 'Group heading' && texts(c).some(t => t.characters.startsWith('Po terminie'));
  const copy = wrap.clone();
  main.insertChild(main.children.indexOf(wrap) + 1, copy);
  copy.layoutSizingHorizontal = 'FILL';
  const ch = texts(copy).find(t => t.characters === 'Wymaga Twojego działania' && t.fontSize === 20); await setText(ch, 'Po terminie');
  const clist = ch.parent.parent.children.find(c => c.name === 'List');
  for (const c of [...clist.children]) if (!isOverdue(c)) c.remove();
  for (const c of [...list.children]) if (isOverdue(c) || c.name === 'Group heading') c.remove();
  bump('sections'); refit(f);
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
relayout();
const f01 = sections[0].children.find(n => n.name.startsWith('01 '));
await shot(f01, { name: 'v-01', scale: 0.5 });
return { log, errors };
