//# Odtworzenie bloków Planu po pozycji (treść z danych Librusa)
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const CE = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar event');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const darkId = cols.find(c => c.name === 'Color Dark').id, lightId = cols.find(c => c.name === 'Color').id;
const byId = Object.fromEntries(vars.map(v => [v.id, v])); const darkByName = Object.fromEntries(vars.filter(v => v.variableCollectionId === darkId).map(v => [v.name, v]));
const toDark = n => { for (const node of [n, ...n.findAll(() => true)]) for (const key of ['fills', 'strokes']) { const arr = node[key]; if (!Array.isArray(arr) || !arr.length) continue;
  let ch = false; const next = arr.map(p => { const b = p.boundVariables && p.boundVariables.color; if (!b) return p; const v = byId[b.id]; if (!v || v.variableCollectionId !== lightId) return p; const d = darkByName[v.name]; if (!d) return p; ch = true; return figma.variables.setBoundVariableForPaint(p, 'color', d); });
  if (ch) try { node[key] = next; } catch (e) {} } };
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); } catch (e) {} } };
const ALLDAY = [['Dokończyć ćwiczenia ze str. 20 (położenie przedmiotów)', 'Zadanie, Edukacja polonistyczna'], ['Nauka słów piosenki „Specjalne moce pierwszaka"', 'Zadanie, Edukacja artystyczna']];
const out = []; let fixed = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) { const dark = s.name === 'Ciemny motyw';
  for (const f of s.children.filter(n => n.type === 'FRAME' && /^15/.test(n.name))) {
    const lesson = f.findAll(x => x.type === 'INSTANCE' && x.name === 'Calendar event' && x.parent.layoutMode === 'NONE').sort((a, b) => a.y - b.y)[0];
    const ids = f.findAll(x => x.type === 'INSTANCE' && x.name === 'Banner').map(x => x.id);
    let allDayIdx = 0;
    for (const id of ids) { const n = await figma.getNodeByIdAsync(id); if (!n || n.removed) continue;
      const parent = n.parent, idx = parent.children.indexOf(n), inGrid = parent.layoutMode === 'NONE';
      let kind, title, meta;
      if (inGrid) { kind = 'Own'; title = 'Koniki'; meta = '16:00 do 17:00, własne zajęcia'; }
      else { const a = ALLDAY[allDayIdx++] || ALLDAY[0]; kind = 'Task'; title = a[0]; meta = a[1]; }
      const i = CE.children.find(c => c.name === 'Kind=' + kind).createInstance();
      setP(i, 'Title', title); setP(i, 'Show meta', true); setP(i, 'Meta', meta);
      parent.insertChild(idx, i);
      if (inGrid && lesson) { i.resize(lesson.width, 60); i.x = lesson.x; i.y = 9 * 60; }
      else { try { i.layoutSizingHorizontal = 'FILL'; } catch (e) {} i.resize(i.width, 44); }
      if (dark) toDark(i); n.remove(); fixed++; out.push(f.name.slice(0, 12) + ' ' + kind + ' ' + title.slice(0, 16)); } } }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('15 '), { name: 'r-15', scale: 0.45 });
return { fixed, out };
