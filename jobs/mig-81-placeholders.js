//# Poprawka: placeholdery pól formularzy z oryginalnej treści
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const PLACE = { '13 ': [['Do', 'Wybierz odbiorcę'], ['Temat', ''], ['Treść', '']], '14 ': [['Do', 'Wybierz odbiorcę'], ['Temat', ''], ['Treść', '']], '08 ': [['Odpowiedź do', '']], '09 ': [['Odpowiedź do', '']], '10 ': [['Odpowiedź do', '']] };
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); return true; } catch (e) {} } return false; };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; };
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const key = Object.keys(PLACE).find(p => f.name.startsWith(p.trim())); if (!key) continue;
  const fields = f.findAll(x => x.type === 'INSTANCE' && x.name === 'Text field');
  const wanted = PLACE[key];
  fields.forEach((fl, i) => { const w = wanted[i]; if (!w) return; setP(fl, 'Value', w[1] || ' '); bump('field'); });
}
// „Szukaj wiadomości" i inne pola z własnym placeholderem
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  if (!/^(07|11|12|23)/.test(f.name)) continue;
  for (const fl of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Text field')) { setP(fl, 'Value', ' '); bump('search'); }
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
for (const [p, n] of [['13 ', 'p-13'], ['01 ', 'p-01d']]) { const fr = get(p); if (fr) await shot(fr, { name: n, scale: 0.5 }); }
const dark = page.children.find(n => n.name === 'Ciemny motyw');
await shot(dark.children.find(n => n.name.startsWith('01 ')), { name: 'p-dark01', scale: 0.4 });
await shot(dark.children.find(n => n.name.startsWith('13 ')), { name: 'p-dark13', scale: 0.5 });
return stat;
