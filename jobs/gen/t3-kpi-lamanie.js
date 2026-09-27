//# opis: KPI card - Title i Detail lamia sie zamiast wychodzic poza karte
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kpi = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'KPI card' && (!n.parent || n.parent.type !== 'COMPONENT_SET'));
const log = [];
for (const nz of ['Title', 'Detail']) {
  const t = kpi.children.find(c => c.name === nz);
  if (!t) { log.push('brak ' + nz); continue; }
  t.textAutoResize = 'HEIGHT';
  t.layoutSizingHorizontal = 'FILL';
  log.push(nz + ': FILL/HEIGHT, ' + Math.round(t.width) + 'x' + Math.round(t.height));
}
log.push('kpi ' + Math.round(kpi.width) + 'x' + Math.round(kpi.height));
return log;
