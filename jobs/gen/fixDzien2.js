//# opis: pelne tytuly zadan poza kalendarzem
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const PELNE = {
  'Dokończyć ćwiczenia ze str. 20': 'Dokończyć ćwiczenia ze str. 20 (położenie przedmiotów)',
  'Nauka słów piosenki': 'Nauka słów piosenki „Specjalne moce pierwszaka”'
};
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const wKalendarzu = /^1[5-8]|^15[ab]/.test(f.name);
  for (const t of f.findAll(n => n.type === 'TEXT' && PELNE[n.characters.trim()])) {
    // w kalendarzu zostaje krótki tytuł, na listach wraca pełny
    const wSiatce = !!(t.parent && /Calendar event|Event|TimeGrid|cały dzień/i.test(t.parent.name + ' ' + (t.parent.parent ? t.parent.parent.name : '')));
    if (wKalendarzu && wSiatce) continue;
    const v = t.characters.trim();
    let n = t.parent; let zrobione = false;
    while (n && n.type !== 'PAGE') {
      if (n.type === 'INSTANCE' && n.componentProperties) {
        const k = Object.keys(n.componentProperties).find(x => n.componentProperties[x].type === 'TEXT' && String(n.componentProperties[x].value).trim() === v);
        if (k) { n.setProperties({ [k]: PELNE[v] }); zrobione = true; break; }
      }
      n = n.parent;
    }
    if (!zrobione) { try { t.characters = PELNE[v]; } catch (e) {} }
    log.push({ screen: f.name, na: PELNE[v] });
  }
}
const f15 = sec.children.find(x => x.name === '15 Plan · dzień');
await shot(f15, { scale: 0.7, name: 'vP-15' });
const f01 = sec.children.find(x => x.name === '01 Teraz');
await shot(f01, { scale: 0.5, name: 'vP-01' });
return { n: log.length, probka: log.slice(0, 8) };
