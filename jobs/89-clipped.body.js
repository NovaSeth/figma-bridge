//# #47: listy z przyciętą treścią dopasowane do zawartości
const fixed = [];
for (const { f } of screens()) {
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  let changed = false;
  for (const n of main.findAll(x => x.type === 'FRAME' && x.layoutMode === 'VERTICAL' && x.clipsContent && x.layoutSizingVertical === 'FIXED' && x.children.length > 0)) {
    const flow = n.children.filter(c => c.layoutPositioning !== 'ABSOLUTE' && c.visible); if (!flow.length) continue;
    const last = flow[flow.length - 1]; const overflow = last.y + last.height + n.paddingBottom - n.height;
    if (overflow > 1 && n.name !== 'Body' && n.name !== 'Main Content') { n.layoutSizingVertical = 'HUG'; for (let p = n.parent; p && p !== main; p = p.parent) { try { if (p.layoutMode !== 'NONE' && p.layoutSizingVertical === 'FIXED' && p.name !== 'Body') p.layoutSizingVertical = 'HUG'; } catch (e) {} } fixed.push(f.name.slice(0, 18) + ' › ' + n.name + ' +' + Math.round(overflow)); changed = true; }
  }
  if (changed) refit(f);
}
relayout();
const f01 = sections[0].children.find(n => n.name.startsWith('01 ')); const p3 = texts(f01).find(t => t.characters.startsWith('Logopedia')); let sec3 = p3; while (sec3.parent !== f01.children[1]) sec3 = sec3.parent;
await shot(sec3, { name: 'v-p3', scale: 0.8 });
return fixed;
