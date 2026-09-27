//# opis: akcja w banerze pod tekstem, nie na nim
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Banner');
const log = [];
for (const v of set.children) {
  const rec = { wariant: v.name, layout: v.layoutMode, przed: v.children.map(c => c.name + ':' + c.layoutPositioning + '@' + Math.round(c.y)) };
  v.layoutMode = 'VERTICAL';
  v.primaryAxisSizingMode = 'AUTO';
  v.counterAxisSizingMode = 'FIXED';
  v.itemSpacing = 6;
  for (const c of v.children) {
    c.layoutPositioning = 'AUTO';
    if (c.type === 'TEXT') { c.textAutoResize = 'HEIGHT'; c.layoutSizingHorizontal = 'FILL'; }
  }
  rec.po = v.children.map(c => c.name + ':' + c.layoutPositioning + '@' + Math.round(c.y));
  rec.h = Math.round(v.height);
  log.push(rec);
}
// podgląd z włączoną akcją
const test = set.children.find(c => /Warning/.test(c.name));
const inst = test.createInstance();
ds.appendChild(inst);
inst.x = set.x; inst.y = set.y + set.height + 40;
const kP = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === 'Show action');
if (kP) inst.setProperties({ [kP]: true });
await shot(inst, { scale: 1.5, name: 'vDS-Banner-akcja' });
inst.remove();
return log;
