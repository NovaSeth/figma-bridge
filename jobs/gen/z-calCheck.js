//# opis: policz instancje Calendar event i ich stan
const strony = figma.root.children;
const out = { razem: 0, bezState: [], wgState: {}, warianty: {} };
for (const p of strony) {
  await p.loadAsync();
  for (const i of p.findAllWithCriteria({ types: ['INSTANCE'] })) {
    const mc = await i.getMainComponentAsync();
    if (!mc || !mc.parent || mc.parent.name !== 'Calendar event') continue;
    out.razem++;
    out.warianty[mc.name] = (out.warianty[mc.name] || 0) + 1;
    const st = i.componentProperties.State;
    if (!st) out.bezState.push(p.name + ' / ' + i.name);
    else out.wgState[st.value] = (out.wgState[st.value] || 0) + 1;
  }
}
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar event');
await shot(set, { scale: 2, name: 'ds-calendar-event' });
return out;
