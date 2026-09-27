//# opis: dopracowanie 15b
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = light.children.find(x => x.name === '15b Plan · szczegóły oferty zajęć');
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const body = sheet.children.find(c => c.name === 'Body');
const dbg = { body: { layout: body.layoutMode, sizV: body.layoutSizingVertical, h: Math.round(body.height) }, sheet: { sizV: sheet.layoutSizingVertical, h: Math.round(sheet.height) } };
// tytuł i meta mają się zawijać w szerokości arkusza
for (const t of body.children.filter(c => c.type === 'TEXT')) {
  t.layoutSizingHorizontal = 'FILL';
  t.textAutoResize = 'HEIGHT';
}
// arkusz obejmuje tylko swoją treść
body.layoutSizingVertical = 'HUG';
sheet.layoutSizingVertical = 'HUG';
const act = sheet.children.find(c => c.name === 'Sheet actions');
dbg.buttons = act ? act.findAll(n => n.type === 'INSTANCE').map(n => ({ n: n.name, props: n.componentProperties ? Object.keys(n.componentProperties) : null })) : null;
if (act) {
  const btns = act.findAll(n => n.type === 'INSTANCE' && n.name === 'Button');
  const labels = ['Dodaj do planu', 'Pokaż ogłoszenie'];
  btns.forEach((b, i) => {
    if (i >= labels.length) return;
    const k = Object.keys(b.componentProperties || {}).find(x => ['Label','Text','Title'].indexOf(x.split('#')[0]) >= 0);
    if (k) b.setProperties({ [k]: labels[i] });
    else { const t = b.findOne(n => n.type === 'TEXT'); if (t) t.characters = labels[i]; }
  });
}
sheet.y = 874 - sheet.height;
await shot(f, { scale: 1, name: 'v77-15b' });
dbg.after = { sheetH: Math.round(sheet.height), y: Math.round(sheet.y) };
return dbg;
