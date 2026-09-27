//# Poprawka błędów walidacji (luźniejsze wykrywanie)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const vars = await figma.variables.getLocalVariablesAsync(); const vName = id => { const v = vars.find(x => x.id === id); return v ? v.name.replace('color/', '') : null; };
const tok = n => { const f = Array.isArray(n.fills) && n.fills[0]; return f && f.boundVariables && f.boundVariables.color ? vName(f.boundVariables.color.id) : null; };
const inInstance = n => { for (let p = n.parent; p; p = p.parent) if (p.type === 'INSTANCE') return true; return false; };
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); return true; } catch (e) {} } return false; };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; }; const diag = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  const loose = main.findAllWithCriteria({ types: ['TEXT'] }).filter(t => tok(t) === 'error' && !inInstance(t));
  const fields = main.findAll(x => x.type === 'INSTANCE' && x.name === 'Text field' && (x.componentProperties['State'] || {}).value === 'Error');
  if (!loose.length && !fields.length) continue;
  diag.push(f.name.slice(0, 16) + ': luźnych=' + loose.length + ' pól=' + fields.length + ' [' + loose.map(t => t.characters.slice(0, 22)).join(' | ') + ']');
  const msgs = loose.map(t => t.characters);
  fields.forEach((fl, i) => { const m = msgs[i]; if (m) { setP(fl, 'Error text', m); bump('set'); } });
  for (const t of loose) { let wrap = t; while (wrap.parent && wrap.parent.children.length === 1 && wrap.parent.name !== 'Main Content' && wrap.parent.type !== 'INSTANCE') wrap = wrap.parent; wrap.remove(); bump('removed'); }
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
for (const [p, n] of [['09 ', 'e-09'], ['14 ', 'e-14']]) { const fr = get(p); if (fr) await shot(fr, { name: n, scale: 0.5 }); }
return { stat, diag };
