//# opis: pasek "caly dzien" - tytuly bez uciecia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const KROTKIE = {
  'Dokończyć ćwiczenia ze str. 20 (położenie przedmiotów)': 'Dokończyć ćwiczenia ze str. 20',
  'Nauka słów piosenki „Specjalne moce pierwszaka”': 'Nauka słów piosenki'
};
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const caly = f.findOne(n => n.type === 'FRAME' && /cały dzień|Allday|All day/i.test(n.name));
  for (const ev of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Calendar event')) {
    const p = ev.componentProperties || {};
    const k = Object.keys(p).find(x => x.split('#')[0] === 'Title');
    if (!k) continue;
    const v = String(p[k].value);
    if (!KROTKIE[v]) continue;
    ev.setProperties({ [k]: KROTKIE[v] });
    log.push({ screen: f.name, z: v, na: KROTKIE[v] });
  }
  // takie same tytuly moga byc zwyklymi tekstami
  for (const t of f.findAll(n => n.type === 'TEXT' && KROTKIE[n.characters])) {
    const v = t.characters;
    t.characters = KROTKIE[v];
    log.push({ screen: f.name, z: v, na: KROTKIE[v], typ: 'text' });
  }
}
const f15 = sec.children.find(x => x.name === '15 Plan · dzień');
await shot(f15, { scale: 0.7, name: 'vP-15' });
return log.slice(0, 12);
