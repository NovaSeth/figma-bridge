//# #48: chip „po terminie" bez ikony wykrzyknika (makiety + DS)
const out = {};
for (const pageName of ['[Mobile] User Front', 'Design System']) {
  const page = figma.root.children.find(p => p.name === pageName); await page.loadAsync(); let n = 0;
  for (const node of page.findAll(x => x.name === 'error' && x.parent && x.parent.name === 'Chip' && x.parent.type === 'FRAME')) { node.remove(); n++; }
  for (const t of page.findAllWithCriteria({ types: ['TEXT'] }).filter(t => /ikona wykrzyknika|ikona końcowa error|\+ ikona końcowa/i.test(t.characters))) { await figma.loadFontAsync(t.fontName); t.characters = t.characters.replace('Po terminie: kolor ostrzegawczy i ikona wykrzyknika po dacie', 'Po terminie: kolor ostrzegawczy, bez ikony').replace('po terminie = Warning + ikona końcowa error', 'po terminie = Warning'); n++; }
  if (pageName === 'Design System') { for (const c of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) if (/ikona końcowa error/.test(c.description)) c.description = c.description.replace('po terminie = Warning + ikona końcowa error', 'po terminie = Warning (bez ikony)');
    for (const i of page.findAllWithCriteria({ types: ['INSTANCE'] })) { const k = Object.keys(i.componentProperties || {}).find(k => k.startsWith('Ikona końcowa')); if (k && i.componentProperties[k].value === true) { i.setProperties({ [k]: false }); n++; } } }
  out[pageName] = n;
}
return out;
