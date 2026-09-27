//# opis: puste stany, FAB, banery, nawigacja Planu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { puste: [], fab: [], banery: [], plan24: null };

// 1. puste stany na środku obszaru treści
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const main = f.children.find(c => c.name === 'Main Content');
  if (!main) continue;
  const es = main.children.find(c => c.type === 'INSTANCE' && c.name === 'Empty state');
  if (!es) continue;
  es.layoutSizingVertical = 'FILL';
  es.layoutGrow = 1;
  try { es.primaryAxisAlignItems = 'CENTER'; } catch (e) {}
  log.puste.push({ screen: f.name, h: Math.round(es.height) });
}

// 2. FAB tuż nad paskiem zakładek, treść nie chowa się pod nim
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const fab = f.children.find(c => c.name === 'FAB');
  if (!fab) continue;
  const tabs = f.children.find(c => c.name === 'Tab bar');
  const main = f.children.find(c => c.name === 'Main Content');
  const dol = tabs ? f.height - tabs.height : f.height;
  fab.y = dol - 16 - fab.height;
  fab.x = f.width - 16 - fab.width;
  if (main) main.paddingBottom = Math.max(main.paddingBottom || 0, fab.height + 24);
  log.fab.push({ screen: f.name, y: Math.round(fab.y), frameH: Math.round(f.height) });
}

// 3. ekran ładowania nie pokazuje jednocześnie błędu
const f19 = sec.children.find(x => x.name === '19 Stan · ładowanie');
if (f19) {
  for (const b of f19.findAll(n => n.type === 'INSTANCE' && n.name === 'Banner')) {
    const wrap = b.parent && b.parent.name && b.parent.name.indexOf('margin') >= 0 ? b.parent : b;
    log.banery.push({ screen: f19.name, usuniety: wrap.name });
    wrap.remove();
  }
}
// 4. baner błędu dostaje akcję ponowienia
const f20 = sec.children.find(x => x.name === '20 Stan · błąd odświeżania');
if (f20) {
  const b = f20.findOne(n => n.type === 'INSTANCE' && n.name === 'Banner');
  if (b) {
    const p = b.componentProperties || {};
    const k2 = Object.keys(p).find(x => x.split('#')[0] === 'Text2');
    if (k2) b.setProperties({ [k2]: 'Spróbuj ponownie' });
    log.banery.push({ screen: f20.name, props: Object.keys(p).map(x => x.split('#')[0]).join(',') });
  }
}
return log;
