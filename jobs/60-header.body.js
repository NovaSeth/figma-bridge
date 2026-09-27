// #9 #10: nagłówek bez linii „Prototyp…" i bez stempla danych, z przyciskiem ustawień
let changed = 0;
for (const { f, T } of screens()) {
  const header = f.children[0]; if (!header || header.name !== 'Header') continue;
  const proto = header.children.find(n => texts(n).some(t => t.characters.startsWith('Prototyp')));
  if (proto) { proto.remove(); header.paddingTop = 14; header.paddingBottom = 12; changed++; }
  const row = header.findOne(n => n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL' && n.children.length >= 3 && n.children[0].cornerRadius === 22);
  if (row && !row.findOne(n => n.name === 'Button - Ustawienia')) {
    const syncCol = row.children[2];
    [...syncCol.children].forEach(c => c.remove());
    const btn = al('Button - Ustawienia', 'HORIZONTAL', { cornerRadius: 22, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
    btn.primaryAxisSizingMode = 'FIXED'; btn.counterAxisSizingMode = 'FIXED'; btn.resize(44, 44);
    btn.appendChild(icon('settings', 24, T.ink));
    syncCol.appendChild(btn);
    syncCol.primaryAxisAlignItems = 'CENTER'; syncCol.counterAxisAlignItems = 'MAX';
    syncCol.layoutSizingHorizontal = 'HUG';
  }
  refit(f);
  const menu = f.children.find(c => c.name === 'Kid menu'); if (menu) menu.y = Math.round(header.height) + 6;
}
relayout();
// przegląd tekstów o prototypie/symulacji
const found = new Map();
for (const { f } of screens()) for (const t of texts(f)) if (/prototyp|symul|przykład/i.test(t.characters)) { const k = t.characters.slice(0, 150); found.set(k, (found.get(k) || []).concat(f.name.slice(0, 3).trim())); }
const h = (await figma.getNodeByIdAsync('3:2')).children[0];
await shot(h, { name: 'hdr', scale: 2 });
return { changed, found: [...found.entries()].map(([k, v]) => v.join(',') + ' :: ' + k) };
