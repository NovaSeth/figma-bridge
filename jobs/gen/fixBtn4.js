//# opis: pole Tresc przestaje byc przycinane, Anuluj z obrysem
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME' || f.name.indexOf('Nowa wiadomość') < 0) continue;
  const compose = f.findOne(n => n.name === 'Compose');
  if (!compose) continue;
  const rec = { screen: f.name, fixed: [] };
  // opakowania pól nie mogą mieć sztywnej wysokości — pole z błędem jest wyższe
  for (const c of compose.children) {
    if (c.type !== 'FRAME' || c.layoutMode !== 'VERTICAL') continue;
    if (c.layoutSizingVertical === 'FIXED') {
      const before = Math.round(c.height);
      c.layoutSizingVertical = 'HUG';
      rec.fixed.push(c.name + ': ' + before + ' → ' + Math.round(c.height));
    }
  }
  // drugi przycisk czytelny na tle strony
  const row = compose.children.find(c => c.layoutMode === 'HORIZONTAL' && c.children.filter(x => x.type === 'INSTANCE').length >= 2);
  if (row) {
    const btns = row.children.filter(c => c.type === 'INSTANCE');
    const sec2 = btns[btns.length - 1];
    const kS = Object.keys(sec2.componentProperties || {}).find(x => x === 'Style' || x.split('#')[0] === 'Style');
    if (kS) { try { sec2.setProperties({ [kS]: 'Outline' }); rec.style = 'Outline'; } catch (e) { rec.style = 'nie udało się: ' + e.message; } }
    rec.row = Math.round(row.height);
  }
  await shot(f, { scale: 1, name: 'v-btn-' + f.name.slice(0, 2) + (f.name.indexOf('ciemny') > 0 ? 'd' : '') });
  out.push(rec);
}
return out;
