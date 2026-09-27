//# Odtworzenie bloków w Planie zamienionych omyłkowo na banery
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const CE = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar event');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const darkId = cols.find(c => c.name === 'Color Dark').id, lightId = cols.find(c => c.name === 'Color').id;
const byId = Object.fromEntries(vars.map(v => [v.id, v])); const darkByName = Object.fromEntries(vars.filter(v => v.variableCollectionId === darkId).map(v => [v.name, v]));
const toDark = n => { for (const node of [n, ...n.findAll(() => true)]) for (const key of ['fills', 'strokes']) { const arr = node[key]; if (!Array.isArray(arr) || !arr.length) continue;
  let ch = false; const next = arr.map(p => { const b = p.boundVariables && p.boundVariables.color; if (!b) return p; const v = byId[b.id]; if (!v || v.variableCollectionId !== lightId) return p; const d = darkByName[v.name]; if (!d) return p; ch = true; return figma.variables.setBoundVariableForPaint(p, 'color', d); });
  if (ch) try { node[key] = next; } catch (e) {} } };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const META = { 'Dokończyć ćwiczenia ze str. 20 (położenie przedmiotów)': ['Task', 'Zadanie, Edukacja polonistyczna'], 'Nauka słów piosenki „Specjalne moce pierwszaka"': ['Task', 'Zadanie, Edukacja artystyczna'], 'Koniki': ['Own', '16:00 do 17:00, własne zajęcia'] };
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); } catch (e) {} } };
const out = []; let fixed = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) { const dark = s.name === 'Ciemny motyw';
  for (const f of s.children.filter(n => n.type === 'FRAME' && /^15/.test(n.name))) {
    const ids = f.findAll(x => x.type === 'INSTANCE' && x.name === 'Banner').map(x => x.id);
    // wzorzec geometrii: pozostałe bloki lekcji w siatce
    const lesson = f.findAll(x => x.type === 'INSTANCE' && x.name === 'Calendar event' && x.parent.layoutMode === 'NONE')[0];
    for (const id of ids) { const n = await figma.getNodeByIdAsync(id); if (!n || n.removed) continue;
      const text = T(n)[0].characters; const m = META[text]; if (!m) { out.push('pominięto: ' + text.slice(0, 30)); continue; }
      const v = CE.children.find(c => c.name === 'Kind=' + m[0]); const i = v.createInstance(); setP(i, 'Title', text); setP(i, 'Show meta', true); setP(i, 'Meta', m[1]);
      const parent = n.parent, idx = parent.children.indexOf(n), absolute = parent.layoutMode === 'NONE';
      parent.insertChild(idx, i);
      if (absolute && lesson) { i.resize(lesson.width, 60); i.x = lesson.x; i.y = 9 * 60; }
      else { try { i.layoutSizingHorizontal = 'FILL'; } catch (e) {} i.resize(i.width, 43); }
      if (dark) toDark(i); n.remove(); fixed++; out.push(f.name.slice(0, 12) + ' → ' + m[0] + ' ' + text.slice(0, 18)); } } }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('15 '), { name: 'r-15', scale: 0.45 });
return { fixed, out: out.slice(0, 12) };
