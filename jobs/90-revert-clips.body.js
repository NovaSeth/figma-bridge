//# #47: cofnięcie rozwinięcia zwiniętych sekcji i podglądów wiadomości
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; };
for (const { f } of screens()) {
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  let touched = false;
  for (const n of main.findAll(x => x.type === 'FRAME' && x.clipsContent && x.layoutMode === 'VERTICAL' && x.layoutSizingVertical === 'HUG')) {
    const summary = n.children.find(c => c.name === 'Summary');
    if (summary && ['Details', 'Plan'].includes(n.name)) { const collapsed = texts(summary).some(t => t.characters === '▸' || t.characters.trim() === '▸') || !texts(summary).some(t => t.characters === '▾'); if (collapsed) { n.layoutSizingVertical = 'FIXED'; n.resize(n.width, summary.height); bump('details'); touched = true; } continue; }
    if (n.name === 'Text' && n.children.length === 1 && n.children[0].type === 'TEXT' && n.children[0].fontSize === 15 && n.height >= 60) { n.layoutSizingVertical = 'FIXED'; n.resize(n.width, 42); bump('preview'); touched = true; }
  }
  if (touched) refit(f);
}
relayout();
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('07 '), { name: 'v-07', scale: 0.4 });
await shot(get('01 '), { name: 'v-01', scale: 0.35 });
await shot(get('15 '), { name: 'v-15', scale: 0.4 });
return log;
