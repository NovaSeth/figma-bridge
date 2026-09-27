//# opis: zapowiedz bez ".…", naglowek w DS, rowne marginesy Archiwizuj
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = { zapowiedz: 0, archiwizuj: [] };
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
// 1. zapowiedź ucinana w środku zdania, nie zaraz po kropce
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const inst of f.findAll(n => n.type === 'INSTANCE' && (n.name === 'Feed row' || n.name === 'Message card'))) {
    const p = inst.componentProperties || {};
    const k = Object.keys(p).find(x => x.split('#')[0] === 'Preview');
    if (!k) continue;
    const v = String(p[k].value);
    if (v.indexOf('zielonych ćwiczeń. Proszę') < 0) continue;
    inst.setProperties({ [k]: v.replace('zielonych ćwiczeń. Proszę', 'zielonych ćwiczeń — proszę') });
    log.zapowiedz++;
  }
  // 2. przyciski Archiwizuj równo przy prawej krawędzi
  for (const row of f.findAll(n => n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL' && n.children.some(c => c.type === 'INSTANCE' && /Archiwizuj/.test(JSON.stringify(c.componentProperties || {}))))) {
    const przed = [row.paddingRight, row.primaryAxisAlignItems];
    row.paddingRight = 12;
    row.primaryAxisAlignItems = 'MAX';
    log.archiwizuj.push({ screen: f.name, przed, po: [row.paddingRight, row.primaryAxisAlignItems] });
  }
}
// 3. nagłówek aplikacji w DS: margines 16 jak reszta treści
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const nazwa of ['App header', 'Cover top bar']) {
  const c = ds.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === nazwa);
  if (!c) continue;
  const cele = c.type === 'COMPONENT_SET' ? c.children : [c];
  for (const v of cele) { if ('paddingLeft' in v) { v.paddingLeft = 16; v.paddingRight = 16; } }
  log[nazwa] = 'padding 16';
}
return log;
