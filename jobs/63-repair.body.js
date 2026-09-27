// Naprawa: wiersze Archiwizuj i „cały dzień" (przywrócenie), światło w wierszach ogłoszeń
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
const inCompleted = n => { for (let p = n.parent; p; p = p.parent) if (p.name === 'Completed') return true; return false; };
for (const { f, T } of screens()) { try {
  const main = f.children[1]; if (!main || main.name !== 'Main Content') continue;
  const items = main.findAll(n => n.type === 'FRAME' && n.name === 'List Item' && !inCompleted(n));
  for (const item of items.filter(i => i.paddingLeft === 16 && i.paddingRight === 12)) {
    const hasArchive = texts(item).some(t => t.characters === 'Archiwizuj');
    if (hasArchive) {
      item.paddingLeft = 12; item.paddingRight = 12; item.paddingTop = 0; item.paddingBottom = 10; item.strokes = [];
      item.primaryAxisAlignItems = 'MAX'; item.counterAxisAlignItems = 'MIN';
      const btn = item.children[0]; btn.layoutGrow = 0; try { btn.layoutSizingHorizontal = 'HUG'; } catch (e) {}
      for (const t of texts(item)) { t.textDecoration = 'NONE'; t.fills = solid(T.ink); try { t.layoutSizingHorizontal = 'HUG'; } catch (e) {} }
      bump('archive-restored');
    } else {
      const sib = items.find(s => s !== item && !(s.paddingLeft === 16 && s.paddingRight === 12));
      if (sib) { for (const k of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'counterAxisAlignItems', 'primaryAxisAlignItems']) item[k] = sib[k]; if (sib.layoutMode !== item.layoutMode) item.layoutMode = sib.layoutMode; bump('allday-restored'); }
      else { item.paddingLeft = 8; item.paddingRight = 8; item.paddingTop = 5; item.paddingBottom = 5; item.counterAxisAlignItems = 'MIN'; bump('allday-guess'); }
    }
  }
  const nh = texts(main).find(t => t.characters === 'Ogłoszenia szkolne' && t.fontSize === 20);
  if (nh) {
    const section = nh.parent.parent, list = section.findOne(n => n.type === 'FRAME' && n.cornerRadius === 20);
    if (list) {
      for (const row of list.children.filter(r => r.type === 'FRAME')) {
        const title = texts(row).find(t => t.fontSize === 17); if (!title) continue;
        const tw = title.parent; tw.layoutSizingHorizontal = 'FILL'; tw.layoutSizingVertical = 'HUG';
        const col = tw.parent; if (col.name === 'Text' && col.layoutMode === 'VERTICAL') { col.layoutSizingVertical = 'HUG'; }
        row.layoutSizingVertical = 'HUG';
      }
      list.layoutSizingVertical = 'HUG';
      for (let p = list.parent; p && p !== main; p = p.parent) { try { p.layoutSizingVertical = 'HUG'; } catch (e) {} }
      bump('notices');
    }
  }
  refit(f);
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
relayout();
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
const f01 = get('01 '); const nh = texts(f01).find(t => t.characters === 'Ogłoszenia szkolne'); let secN = nh; while (secN.parent !== f01.children[1]) secN = secN.parent;
await shot(secN, { name: 'v-notices', scale: 1 });
const z = get('04 '); const arch = texts(z).find(t => t.characters === 'Archiwizuj'); let card = arch; while (card.cornerRadius !== 20) card = card.parent;
await shot(card, { name: 'v-04card', scale: 1 });
const p15 = get('15 '); const ad = p15.findOne(n => n.name === 'List Item'); await shot(ad.parent.parent, { name: 'v-15allday', scale: 1.5 });
return { log, errors };
