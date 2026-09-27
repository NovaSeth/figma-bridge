//# Poprawka: komunikaty błędów w polach (bez duplikatów)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const styles = await figma.getLocalTextStylesAsync(); const sName = id => { const s = styles.find(x => x.id === id); return s ? s.name : null; };
const vars = await figma.variables.getLocalVariablesAsync(); const vName = id => { const v = vars.find(x => x.id === id); return v ? v.name.replace('color/', '') : null; };
const isErrText = t => { const f = Array.isArray(t.fills) && t.fills[0]; const tok = f && f.boundVariables && f.boundVariables.color ? vName(f.boundVariables.color.id) : null; return tok === 'error' && sName(t.textStyleId) === 'label/sm'; };
const inInstance = n => { for (let p = n.parent; p; p = p.parent) if (p.type === 'INSTANCE') return true; return false; };
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); return true; } catch (e) {} } return false; };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; };
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  const loose = main.findAllWithCriteria({ types: ['TEXT'] }).filter(t => isErrText(t) && !inInstance(t));
  if (!loose.length) continue;
  const fields = main.findAll(x => x.type === 'INSTANCE' && x.name === 'Text field');
  const errFields = fields.filter(x => (x.componentProperties['State'] || {}).value === 'Error');
  const msgs = loose.map(t => t.characters);
  errFields.forEach((fl, i) => { const m = msgs[i] || msgs[msgs.length - 1]; if (m) { setP(fl, 'Error text', m); bump('set'); } });
  for (const t of loose) { const wrap = t.parent && t.parent.children.length === 1 && t.parent.name !== 'Main Content' ? t.parent : t; wrap.remove(); bump('removed'); }
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
for (const [p, n] of [['09 ', 'e-09'], ['14 ', 'e-14']]) { const fr = get(p); if (fr) await shot(fr, { name: n, scale: 0.5 }); }
return stat;
