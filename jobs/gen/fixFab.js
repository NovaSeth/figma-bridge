//# opis: FAB nad stopka, szewron sekcji rozwinietej
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { fab: [], szewron: [] };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const fab = f.children.find(c => c.name === 'FAB');
  if (!fab) continue;
  const tabs = f.children.find(c => c.name === 'Tab bar');
  const main = f.children.find(c => c.name === 'Main Content');
  if (main) main.paddingBottom = Math.max(main.paddingBottom || 0, fab.height + 32);
  const dol = tabs ? f.height - tabs.height : f.height;
  fab.y = dol - 16 - fab.height;
  fab.x = f.width - 16 - fab.width;
  log.fab.push({ screen: f.name, frameH: Math.round(f.height), fabY: Math.round(fab.y), padB: main ? main.paddingBottom : null });
}
// sekcja rozwinięta: szewron w dół
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const d of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Disclosure')) {
    const p = d.componentProperties || {};
    const k = Object.keys(p).find(x => ['Open','Expanded','State'].indexOf(x.split('#')[0]) >= 0);
    log.szewron.push({ screen: f.name, props: Object.keys(p).map(x => x.split('#')[0] + '=' + JSON.stringify(p[x].value)).join(' | ') });
    if (k) { try { d.setProperties({ [k]: p[k].type === 'BOOLEAN' ? true : 'Open' }); log.szewron.push({ screen: f.name, ustawione: k.split('#')[0] }); } catch (e) { log.szewron.push({ screen: f.name, blad: e.message }); } }
  }
}
return log;
