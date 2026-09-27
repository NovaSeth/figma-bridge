//# #73: wiersze zrobione i zarchiwizowane z kółkiem, ptaszkiem i przedmiotem
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const lr = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const target = lr.children.find(v => v.name === 'Leading=Checkbox, Trailing=None');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
for (const st of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: st });
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); } catch (e) {} } };
const getP = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const SUBJECT = { 'Ćwiczenia polonistyczne str. 17-19 + matematyczne do str. 10': 'Edukacja polonistyczna', 'Nazwy obrazków: podziel na sylaby (zeszyt)': 'Edukacja polonistyczna', 'Dokończyć ćwiczenia ze str. 20 (położenie przedmiotów)': 'Edukacja polonistyczna', 'Nauka słów piosenki „Specjalne moce pierwszaka"': 'Edukacja artystyczna', 'Przynieść pocztówkę z wakacji': 'Edukacja wczesnoszkolna', 'Kaligrafia: wzory do strony 5': 'Edukacja polonistyczna', 'Julia od 2 dni nie ma małych zielonych ćwiczeń': 'Joanna Osęka-Więcławicz' };
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  for (const g of main.findAll(x => x.type === 'FRAME' && x.name === 'Completed')) {
    const head = T(g.children.find(c => c.type === 'INSTANCE' && c.name === 'Disclosure') || g)[0];
    if (!head || !/^(Zrobione|Archiwum)/.test(head.characters)) continue;
    for (const row of g.findAll(x => x.type === 'INSTANCE' && x.name === 'List row')) {
      const title = String(getP(row, 'Title') || '').trim();
      if (getP(row, 'Leading') !== 'Checkbox') row.swapComponent(target);
      setP(row, 'Title', title); const sub = SUBJECT[title];
      setP(row, 'Show subtitle', !!sub); if (sub) setP(row, 'Subtitle', sub);
      setP(row, 'Show chips', false); setP(row, 'Show chips top', false);
      const chk = row.findOne(n => n.type === 'INSTANCE' && n.name === 'Leading'); if (chk) { try { chk.setProperties({ Checked: 'True' }); } catch (e) {} }
      const t = row.findOne(n => n.name === 'Title'); if (t) t.textDecoration = 'STRIKETHROUGH';
      out.push(f.name.slice(0, 10) + ' ' + head.characters.slice(0, 9) + ' → ' + title.slice(0, 22)); } }
  main.layoutGrow = 0; main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
  if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1; }
}
const PAD = 160, LABEL_H = 120, ROW_GAP = 280;
for (const section of page.children.filter(n => n.type === 'SECTION')) { const frames = section.children.filter(n => n.type === 'FRAME'), labels = section.children.filter(n => n.type === 'TEXT').sort((a, b) => a.y - b.y);
  let y = PAD, right = 0;
  for (const label of labels) { const row = frames.filter(fr => Math.abs(fr.y - (label.y + LABEL_H)) < 2); label.y = y; y += LABEL_H; let h = 0; for (const fr of row) { fr.y = y; h = Math.max(h, fr.height); right = Math.max(right, fr.x + fr.width); } y += h + ROW_GAP; }
  section.resizeWithoutConstraints(Math.max(section.width, right + PAD), y - ROW_GAP + PAD); }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('05 '), { name: 'd-05', scale: 0.5 }); await shot(get('03 '), { name: 'd-03', scale: 0.45 });
return out.slice(0, 12);
