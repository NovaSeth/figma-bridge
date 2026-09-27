//# #73: wiersze w grupach „Zrobione" i „Archiwum" jako wiersze z kółkiem
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const lr = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); } catch (e) {} } };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const SUBJECT = { 'Ćwiczenia polonistyczne str. 17-19 + matematyczne do str. 10': 'Edukacja polonistyczna', 'Nazwy obrazków: podziel na sylaby (zeszyt)': 'Edukacja polonistyczna', 'Dokończyć ćwiczenia ze str. 20 (położenie przedmiotów)': 'Edukacja polonistyczna', 'Nauka słów piosenki „Specjalne moce pierwszaka"': 'Edukacja artystyczna', 'Przynieść pocztówkę z wakacji': 'Edukacja wczesnoszkolna', 'Kaligrafia: wzory do strony 5': 'Edukacja polonistyczna', 'Julia od 2 dni nie ma małych zielonych ćwiczeń': 'Joanna Osęka-Więcławicz' };
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  const groups = main.findAll(x => x.type === 'FRAME' && ['Completed', 'Details'].includes(x.name) && x.children.some(c => c.type === 'INSTANCE' && c.name === 'Disclosure'));
  let touched = false;
  for (const g of groups) {
    const head = T(g.children.find(c => c.type === 'INSTANCE' && c.name === 'Disclosure'))[0];
    if (!head || !/^(Zrobione|Archiwum)/.test(head.characters)) continue;
    const lists = g.children.filter(c => c !== g.children[0] && c.type === 'FRAME');
    for (const list of lists) {
      const plan = list.children.filter(c => c.type !== 'RECTANGLE' && !(c.type === 'INSTANCE' && c.name === 'List row')).map(c => ({ id: c.id, texts: T(c).map(t => t.characters) }));
      for (const p of plan) { const row = await figma.getNodeByIdAsync(p.id); if (!row || row.removed) continue;
        const title = p.texts.find(t => t.length > 6 && !/^Cofnij$/.test(t)); if (!title) continue;
        const i = lr.children.find(v => v.name === 'Leading=Checkbox, Trailing=None').createInstance();
        setP(i, 'Title', title); const sub = SUBJECT[title.trim()]; setP(i, 'Show subtitle', !!sub); if (sub) setP(i, 'Subtitle', sub);
        setP(i, 'Show chips', false); setP(i, 'Show chips top', false);
        const chk = i.findOne(n => n.type === 'INSTANCE' && n.name === 'Leading'); if (chk) { try { chk.setProperties({ Checked: 'True' }); } catch (e) {} }
        const t = i.findOne(n => n.name === 'Title'); if (t) t.textDecoration = 'STRIKETHROUGH';
        list.insertChild(list.children.indexOf(row), i); try { i.layoutSizingHorizontal = 'FILL'; } catch (e) {}
        row.remove(); touched = true; out.push(f.name.slice(0, 12) + ' ' + head.characters.slice(0, 10) + ' → ' + title.slice(0, 24)); } }
  }
  if (touched) { main.layoutGrow = 0; main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
    if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1; } }
}
const PAD = 160, LABEL_H = 120, ROW_GAP = 280;
for (const section of page.children.filter(n => n.type === 'SECTION')) { const frames = section.children.filter(n => n.type === 'FRAME'), labels = section.children.filter(n => n.type === 'TEXT').sort((a, b) => a.y - b.y);
  let y = PAD, right = 0;
  for (const label of labels) { const row = frames.filter(fr => Math.abs(fr.y - (label.y + LABEL_H)) < 2); label.y = y; y += LABEL_H; let h = 0; for (const fr of row) { fr.y = y; h = Math.max(h, fr.height); right = Math.max(right, fr.x + fr.width); } y += h + ROW_GAP; }
  section.resizeWithoutConstraints(Math.max(section.width, right + PAD), y - ROW_GAP + PAD); }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('05 '), { name: 'd-05', scale: 0.5 });
return out.slice(0, 12);
