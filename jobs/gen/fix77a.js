//# opis: #77 chipy nad tytulem w ofercie zajec + szewron
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ids = [];
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const inst of f.findAll(n => n.type === 'INSTANCE' && (n.name === 'List row' || n.name === 'Feed row'))) {
    const p = inst.componentProperties || {};
    const k = (pre) => Object.keys(p).find(x => x.split('#')[0] === pre);
    const kShow = k('Show chips');
    if (!kShow || p[kShow].value !== true) continue;
    ids.push({ id: inst.id, screen: f.name });
  }
}
const done = [];
let i = 0;
for (const { id, screen } of ids) {
  i++; progress(i / ids.length, screen);
  const inst = await figma.getNodeByIdAsync(id);
  if (!inst) continue;
  const p = inst.componentProperties || {};
  const k = (pre) => Object.keys(p).find(x => x.split('#')[0] === pre);
  const bottom = inst.findOne(n => n.name === 'Chips');
  const labels = bottom ? bottom.children.filter(c => c.visible).map(c => {
    const t = c.findAll(n => n.type === 'TEXT').map(n => n.characters).filter(Boolean);
    return t.join(' ');
  }) : [];
  // przelacz na gorny slot
  const set = {};
  if (k('Show chips top')) set[k('Show chips top')] = true;
  if (k('Show chips')) set[k('Show chips')] = false;
  if (k('Show chip top 2')) set[k('Show chip top 2')] = labels.length > 1;
  if (Object.keys(set).length) inst.setProperties(set);
  // przepisz teksty do gornych chipow
  const top = inst.findOne(n => n.name === 'Chips top');
  if (top) {
    const slots = top.children;
    for (let s = 0; s < Math.min(slots.length, labels.length); s++) {
      const chip = slots[s];
      if (chip.type === 'INSTANCE' && chip.componentProperties) {
        const ck = Object.keys(chip.componentProperties).find(x => x.split('#')[0] === 'Label' || x.split('#')[0] === 'Text');
        if (ck) { chip.setProperties({ [ck]: labels[s] }); continue; }
      }
      const t = chip.findOne ? chip.findOne(n => n.type === 'TEXT') : null;
      if (t) t.characters = labels[s];
    }
  }
  // wiersz prowadzi do arkusza ze szczegolami
  const kT = k('Trailing');
  if (kT && inst.componentProperties[kT].value === 'None') inst.setProperties({ [kT]: 'Chevron' });
  done.push({ screen, id, labels });
}
return { n: done.length, done: done.slice(0, 4) };
