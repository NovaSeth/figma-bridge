//# #36 #37: Frekwencja z przełącznikiem miesięcy nad zieloną kartą KPI
const light = sections[0], T = THEMES['Jasny motyw'];
const get = p => light.children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
const f = get('02f'), main = f.children[1];
const pinned = await figma.getNodeByIdAsync('47:2569');
const info = { pinned: pinned ? pinned.name + ' / ' + pinned.type : null };
const summary = main.findOne(n => n.name === 'Summary');
if (!main.findOne(n => n.name === 'Date nav')) {
  const idx = main.children.indexOf(summary);
  const seg = get('02g').findOne(n => n.name === 'Segmented').clone();
  seg.children[2].remove(); const labs = texts(seg); await setText(labs[0], 'Miesiąc'); await setText(labs[1], 'Rok');
  main.insertChild(idx, seg); seg.layoutSizingHorizontal = 'FILL';
  const navSrc = get('17 ').findOne(n => n.name === 'Date nav'), nav = navSrc.clone();
  const bar = al('Month bar', 'HORIZONTAL', { paddingTop: 10, paddingBottom: 10, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
  bar.appendChild(nav); main.insertChild(idx + 1, bar); bar.layoutSizingHorizontal = 'FILL';
  const old = main.children.find(c => c.name === 'Heading 2' && texts(c).some(t => t.characters === 'Wrzesień'));
  if (old) { old.remove(); const sp = figma.createFrame(); sp.name = 'Spacer'; sp.fills = []; sp.resize(10, 16); main.insertChild(main.children.indexOf(summary) + 1, sp); }
}
// zielona karta KPI (kolory „sukces"), treść zależna od wybranego miesiąca
summary.fills = solid('#CEEAD6');
for (const t of texts(summary)) t.fills = solid('#0D652D');
const sub = texts(summary).find(t => t.characters.includes('nieobecności')); if (sub) await setText(sub, '0 nieobecności, 0 spóźnień we wrześniu');
main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
relayout();
await shot(f, { name: 'v-02f', scale: 0.6 });
return info;
