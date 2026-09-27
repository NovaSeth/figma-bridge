//# #38: szewrony zawsze na środku wiersza
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
const inside = (n, name) => { for (let p = n.parent; p; p = p.parent) if (p.name === name || (p.name || '').startsWith(name)) return true; return false; };
for (const { f, T } of screens()) { try {
  const icons = f.findAll(n => isIcon(n) && ['chevron_right', 'expand_more'].includes(n.characters));
  for (const t of icons) {
    if (t.removed || t.parent.name === 'Chevron' || inside(t, 'Header') || inside(t, 'Date nav') || inside(t, 'Button - ')) continue;
    let row = t.parent; while (row && !(row.type === 'FRAME' && row.layoutMode === 'HORIZONTAL' && row.itemSpacing === 12)) row = row.parent;
    if (!row || row.children.some(c => c.name === 'Chevron')) continue;
    if (row.counterAxisAlignItems === 'CENTER' && t.parent === row) continue;
    const chars = t.characters;
    let top = t; while (top.parent !== row && top.parent.children.length === 1) top = top.parent; // opakowanie samej ikony
    if (top.parent === row) continue;
    top.remove();
    const w = al('Chevron', 'VERTICAL', { primaryAxisAlignItems: 'CENTER' }); w.appendChild(icon(chars, 24, T.sec)); row.appendChild(w); w.layoutSizingVertical = 'FILL';
    const glyph = w.children[0]; await figma.loadFontAsync({ family: 'Material Icons', style: 'Regular' }); glyph.fontName = { family: 'Material Icons', style: 'Regular' };
    bump(chars);
  }
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('02a').findOne(n => n.name === 'Bottom sheet'), { name: 'v-02a-sheet', scale: 0.6 });
await shot(get('07 ').children[1].findOne(n => n.name === 'MsgList' && n.cornerRadius === 20), { name: 'v-07list', scale: 0.5 });
return { log, errors };
