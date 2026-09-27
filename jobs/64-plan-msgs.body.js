// #23 #24 #29 #31 + wiersze „cały dzień" w Planie
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
for (const { f, T } of screens()) { try {
  const main = f.children[1]; if (!main || main.name !== 'Main Content') continue;
  // wiersze „cały dzień" (widok dnia): ikona obok tekstu zamiast na nim
  for (const item of main.findAll(n => n.type === 'FRAME' && n.name === 'List Item' && n.parent.name.startsWith('List - Cały') && n.layoutMode === 'VERTICAL')) {
    const [ic, col] = item.children; if (!ic || !col) continue;
    item.layoutMode = 'HORIZONTAL'; item.itemSpacing = 5; item.counterAxisAlignItems = 'MIN';
    item.paddingTop = 5; item.paddingBottom = 5; item.paddingLeft = 8; item.paddingRight = 8;
    item.layoutSizingHorizontal = 'FILL'; item.layoutSizingVertical = 'HUG';
    ic.layoutSizingHorizontal = 'HUG'; ic.layoutSizingVertical = 'HUG';
    col.layoutGrow = 1;
    for (const c of col.children) { if (c.layoutMode === 'NONE') { c.layoutMode = 'VERTICAL'; } c.layoutSizingHorizontal = 'FILL'; c.layoutSizingVertical = 'HUG'; for (const t of texts(c)) { t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; } }
    col.layoutSizingVertical = 'HUG';
    const list = item.parent; list.layoutSizingVertical = 'HUG'; bump('allday');
  }
  // #29 strzałki po lewej i prawej stronie daty
  const prev = main.findOne(n => n.name.startsWith('Button - Poprzedni')), next = main.findOne(n => n.name.startsWith('Button - Następny'));
  if (prev && next && prev.parent.name !== 'Date nav') {
    const bar = prev.parent, heading = bar.children.find(c => c.name === 'Heading 2');
    const nav = al('Date nav', 'HORIZONTAL', { itemSpacing: 2, counterAxisAlignItems: 'CENTER' });
    bar.insertChild(0, nav); nav.appendChild(prev); nav.appendChild(heading); nav.appendChild(next);
    heading.layoutSizingHorizontal = 'HUG'; for (const t of texts(heading)) t.textAutoResize = 'WIDTH_AND_HEIGHT';
    bar.primaryAxisAlignItems = 'SPACE_BETWEEN'; bar.layoutSizingHorizontal = 'FILL'; bump('datenav');
  }
  // #23 #24 wiadomości: nieprzeczytane wyróżnione, licznik na „Odebrane"
  if (/^07 /.test(f.name)) {
    const list = main.findOne(n => n.type === 'FRAME' && n.name === 'MsgList' && n.cornerRadius === 20);
    const rows = list ? list.children.filter(r => r.type === 'FRAME') : [];
    for (const [i, row] of rows.entries()) {
      const name = texts(row).find(t => t.fontSize === 17); if (!name) continue;
      if (i < 2) { const tw = name.parent; if (!tw.children.some(c => c.name === 'Unread')) { tw.layoutMode = 'HORIZONTAL'; tw.itemSpacing = 7; tw.counterAxisAlignItems = 'CENTER'; tw.primaryAxisAlignItems = 'MIN'; const dot = figma.createEllipse(); dot.name = 'Unread'; dot.resize(8, 8); dot.fills = solid(T.tint); tw.insertChild(0, dot); tw.layoutSizingVertical = 'HUG'; bump('unread'); } }
      else { name.fontName = { family: 'Inter', style: 'Regular' }; const topic = texts(row).find(t => t.fontSize === 15 && t !== name); bump('read'); }
    }
    const seg = texts(main).find(t => t.characters === 'Odebrane');
    if (seg && !seg.parent.children.some(c => c.name === 'Count')) {
      const b = seg.parent; b.layoutMode = 'HORIZONTAL'; b.itemSpacing = 6; b.primaryAxisAlignItems = 'CENTER'; b.counterAxisAlignItems = 'CENTER';
      const c = al('Count', 'HORIZONTAL', { cornerRadius: 999, paddingLeft: 6, paddingRight: 6, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
      c.fills = solid(T.badge); c.appendChild(mk('2', 'Bold', 11, T.onBadge)); c.counterAxisSizingMode = 'FIXED'; c.resize(c.width, 18); c.minWidth = 18;
      b.appendChild(c); bump('count');
    }
    for (const t of texts(main).filter(t => t.characters === 'Wszystkie wiadomości przeczytane.')) await setText(t, '2 nowe wiadomości.');
  }
  refit(f);
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
// #31 przyciemnienie tła pod listą dzieci
const d = sections[0].children.find(n => n.name.startsWith('02d')), src = sections[0].children.find(n => n.name.startsWith('02 '));
if (d && !d.children.some(c => c.name === 'Scrim')) { const s = src.children.find(c => c.name === 'Scrim').clone(); const menu = d.children.find(c => c.name === 'Kid menu'); d.insertChild(d.children.indexOf(menu), s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; bump('scrim'); }
relayout();
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('15 '), { name: 'v-15', scale: 0.75 });
await shot(get('07 '), { name: 'v-07', scale: 0.75 });
await shot(d, { name: 'v-02d', scale: 0.6 });
return { log, errors };
