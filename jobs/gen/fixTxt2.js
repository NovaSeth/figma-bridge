//# opis: poprawki tekstow: chip terminu, podtytul wiersza
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
// ustawia tekst przez najblizsza wlasciwosc komponentu, a jak sie nie da — wprost
async function setText(t, value) {
  let n = t.parent, old = t.characters;
  while (n && n.type !== 'PAGE') {
    if (n.type === 'INSTANCE' && n.componentProperties) {
      const k = Object.keys(n.componentProperties).find(x => n.componentProperties[x].type === 'TEXT' && n.componentProperties[x].value === old);
      if (k) { n.setProperties({ [k]: value }); return 'prop:' + k.split('#')[0]; }
    }
    n = n.parent;
  }
  try { t.characters = value; return 'text'; } catch (e) { return 'blad: ' + e.message; }
}
const out = { chipy: [], podtytuly: [] };
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const t of f.findAll(n => n.type === 'TEXT' && /(dziś|Dziś)\s*·\s*dziś/i.test(n.characters))) {
    out.chipy.push({ screen: f.name, how: await setText(t, 'dziś') });
  }
  // podtytul = temat wiadomosci, nie inicjaly z awatara
  const MAP = { 'Proszę na poniedziałek 21': 'Pocztówka z wakacji, informacja', 'Proszę Państwa, w załączniku': 'Mała Ortografia' };
  for (const row of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Feed row')) {
    const p = row.componentProperties || {};
    const kSub = Object.keys(p).find(x => x.split('#')[0] === 'Subtitle');
    const kPrev = Object.keys(p).find(x => x.split('#')[0] === 'Preview');
    if (!kSub || !kPrev) continue;
    const sub = String(p[kSub].value), prev = String(p[kPrev].value);
    if (!/^[A-ZĄĆĘŁŃÓŚŹŻ]{2}$/.test(sub.trim())) continue;
    const hit = Object.keys(MAP).find(pre => prev.indexOf(pre) === 0);
    if (hit) { row.setProperties({ [kSub]: MAP[hit] }); out.podtytuly.push({ screen: f.name, from: sub, to: MAP[hit] }); }
  }
}
out.chipyN = out.chipy.length;
out.chipy = out.chipy.slice(0, 3);
return out;
