//# opis: ikona Wyslij, margines siatki miesiaca, zdanie o ofercie
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const ikony = {};
for (const n of ds.findAll(x => x.type === 'COMPONENT' && /^Icon\//.test(x.name))) ikony[n.name] = n.id;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = { ikona: 0, margines: [], zdanie: 0 };
const setText = (t, v) => {
  let n = t.parent; const old = t.characters;
  while (n && n.type !== 'PAGE') {
    if (n.type === 'INSTANCE' && n.componentProperties) {
      const k = Object.keys(n.componentProperties).find(x => n.componentProperties[x].type === 'TEXT' && n.componentProperties[x].value === old);
      if (k) { n.setProperties({ [k]: v }); return true; }
    }
    n = n.parent;
  }
  try { t.characters = v; return true; } catch (e) { return false; }
};
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    // 1. Wyslij ma ikone wysylki
    for (const b of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Button')) {
      const p = b.componentProperties || {};
      const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
      const kI = Object.keys(p).find(x => x.split('#')[0] === 'Icon');
      if (!kL || !kI || String(p[kL].value) !== 'Wyślij') continue;
      if (String(p[kI].value) === ikony['Icon/send']) continue;
      b.setProperties({ [kI]: ikony['Icon/send'] });
      log.ikona++;
    }
    // 2. siatka miesiaca w marginesie ekranu
    const grid = f.findOne(n => n.type === 'FRAME' && n.name === 'MonthGrid');
    if (grid) {
      const opak = grid.parent;
      if ('paddingLeft' in opak && (opak.paddingLeft < 16 || opak.paddingRight < 16)) {
        opak.paddingLeft = 16; opak.paddingRight = 16;
        log.margines.push(sek.name + ' / ' + f.name);
      }
    }
    // 3. zdanie o ofercie
    for (const t of f.findAll(n => n.type === 'TEXT' && /To ogłoszenia, niepotwierdzony zapis/.test(n.characters))) {
      setText(t, t.characters.replace('To ogłoszenia, niepotwierdzony zapis Julii.', 'To ogłoszenia, a nie potwierdzony zapis Julii.'));
      log.zdanie++;
    }
  }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const n of ['17 Plan · miesiąc', '13 Nowa wiadomość']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.7, name: 'vF2-' + n.split(' ')[0] });
}
return log;
