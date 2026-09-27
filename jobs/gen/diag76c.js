//# opis: audyt wszystkich ekranow: Main Content FILL, puste pola, nachodzace przyciski
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const bad = { notFill: [], emptyFields: [], overflow: [] };
for (const sec of page.children) {
  if (sec.type !== 'SECTION') continue;
  for (const f of sec.children) {
    if (f.type !== 'FRAME') continue;
    // 1. Main Content
    const mc = f.children.find(c => c.name === 'Main Content');
    if (mc && (mc.layoutSizingVertical !== 'FILL' || mc.layoutGrow !== 1)) {
      bad.notFill.push({ sec: sec.name, screen: f.name, id: f.id, sizV: mc.layoutSizingVertical, grow: mc.layoutGrow, h: Math.round(f.height) });
    }
    if (!mc) bad.notFill.push({ sec: sec.name, screen: f.name, id: f.id, note: 'brak Main Content', kids: f.children.map(c=>c.name) });
    // 2. puste pola
    for (const inst of f.findAll(n => n.type === 'INSTANCE' && n.name.indexOf('Text field') >= 0)) {
      const val = inst.componentProperties && Object.keys(inst.componentProperties).find(k => k.indexOf('Value#') === 0);
      const v = val ? inst.componentProperties[val].value : null;
      if (v === null || String(v).trim() === '') {
        bad.emptyFields.push({ screen: f.name, id: inst.id, path: (inst.parent && inst.parent.name) || '', key: val, v: JSON.stringify(v) });
      }
    }
    // 3. dzieci wychodzace poza rodzica w poziomie
    for (const n of f.findAll(n => n.type !== 'TEXT' && n.parent && 'width' in n && n.parent.type === 'FRAME' && n.parent.layoutMode === 'HORIZONTAL')) {
      const p = n.parent;
      const inner = p.width - (p.paddingLeft||0) - (p.paddingRight||0);
      const sum = p.children.reduce((s,c)=>s + (c.layoutPositioning==='ABSOLUTE'?0:c.width), 0) + (p.itemSpacing||0) * Math.max(0, p.children.filter(c=>c.layoutPositioning!=='ABSOLUTE').length - 1);
      if (sum > inner + 1) { bad.overflow.push({ screen: f.name, row: p.name, id: p.id, inner: Math.round(inner), sum: Math.round(sum), kids: p.children.map(c=>c.name+':'+Math.round(c.width)) }); }
    }
  }
}
bad.overflow = bad.overflow.filter((v,i,a) => a.findIndex(x=>x.id===v.id) === i);
return bad;
