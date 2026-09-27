// #32 Teraz: osobna przestrzeń „Po terminie" pod „Wymaga Twojego działania"
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
for (const { f, T } of screens()) { try {
  const main = f.children[1]; if (!main || main.name !== 'Main Content') continue;
  const h = texts(main).find(t => t.characters === 'Wymaga Twojego działania' && t.fontSize === 20); if (!h) continue;
  const section = h.parent.parent, list = section.children.find(c => c.name === 'List');
  if (!list || list.children.some(c => c.name === 'Group heading')) continue;
  const cards = list.children.filter(c => c.type === 'FRAME');
  const isOverdue = c => texts(c).some(t => t.characters.startsWith('Po terminie'));
  const overdue = cards.filter(isOverdue), rest = cards.filter(c => !isOverdue(c));
  if (!overdue.length) continue;
  const heading = (label, color, withIcon) => { const r = al('Group heading', 'HORIZONTAL', { itemSpacing: 6, paddingTop: 6, paddingLeft: 4, counterAxisAlignItems: 'CENTER' }); if (withIcon) r.appendChild(icon('error', 20, color)); r.appendChild(mk(label, 'Semi Bold', 15, color, 135)); return r; };
  const a = heading('Po terminie (' + overdue.length + ')', T.due, true);
  list.insertChild(0, a); a.layoutSizingHorizontal = 'FILL';
  overdue.forEach((c, i) => list.insertChild(1 + i, c));
  if (rest.length) { const b = heading('Pozostałe sprawy (' + rest.length + ')', T.sec, false); b.paddingTop = 14; list.insertChild(1 + overdue.length, b); b.layoutSizingHorizontal = 'FILL'; }
  bump('grouped'); refit(f);
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
relayout();
const f01 = sections[0].children.find(n => n.name.startsWith('01 '));
const h = texts(f01).find(t => t.characters === 'Wymaga Twojego działania'); const list = h.parent.parent.children.find(c => c.name === 'List');
const probe = al('probe', 'VERTICAL'); // zrzut samej góry listy
await shot(h.parent.parent, { name: 'v-overdue', scale: 0.55 });
probe.remove();
return { log, errors };
