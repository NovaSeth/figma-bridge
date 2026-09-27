//# opis: ikona spinacza na chipie Zalacznik + odmiana liczebnikow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const ikony = ds.findAll(n => n.type === 'COMPONENT' && /^Icon\//.test(n.name)).map(n => ({ id: n.id, name: n.name }));
const spinacz = ikony.find(i => /attach|clip/i.test(i.name));
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { spinacz: spinacz ? spinacz.name : null, ikony: ikony.map(i => i.name).slice(0, 40), ustawione: 0, teksty: [] };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const chip of f.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name))) {
    const p = chip.componentProperties || {};
    const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    const kI = Object.keys(p).find(x => x.split('#')[0] === 'Icon');
    if (!kL || !kI || String(p[kL].value) !== 'Załącznik' || !spinacz) continue;
    chip.setProperties({ [kI]: spinacz.id });
    log.ustawione++;
  }
  // odmiana: "N zadań" przy 2-4 i 1
  for (const t of f.findAll(n => n.type === 'TEXT' && /zadań|zadan/.test(n.characters))) {
    const stary = t.characters;
    let nowy = stary
      .replace(/(^|[^\d])1\s+zadań/g, '$11 zadanie')
      .replace(/(^|[^\d])([234])\s+zadań/g, '$1$2 zadania');
    if (nowy !== stary) { t.characters = nowy; log.teksty.push({ screen: f.name, z: stary, na: nowy }); }
    else if (/\d\s*zadań/.test(stary)) log.teksty.push({ screen: f.name, bezZmian: stary });
  }
}
return log;
