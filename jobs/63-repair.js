const THEMES = {
  'Jasny motyw': { dark: false, bg: '#F2F2F7', card: '#FFFFFF', ink: '#111113', sec: '#5F6368', sep: '#E3E3E8', ring: '#80868B', tint: '#0B57D0', onTint: '#FFFFFF', tonal: '#D3E3FD', onTonal: '#041E49', chip: '#EDEDF2', due: '#8A4200', dueBg: '#FFE8CF', cta: '#000000', onCta: '#FFFFFF', badge: '#C5221F', onBadge: '#FFFFFF', ok: '#137333' },
  'Ciemny motyw': { dark: true, bg: '#000000', card: '#1C1C1E', ink: '#FFFFFF', sec: '#A8A8AE', sep: '#38383A', ring: '#8E8E93', tint: '#8AB4F8', onTint: '#062E6F', tonal: '#0A3A86', onTonal: '#D3E3FD', chip: '#2C2C2E', due: '#FFC78A', dueBg: '#4A2A00', cta: '#FFFFFF', onCta: '#000000', badge: '#F28B82', onBadge: '#000000', ok: '#81C995' },
};
const hex = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const solid = (h, opacity) => [opacity == null ? { type: 'SOLID', color: hex(h) } : { type: 'SOLID', color: hex(h), opacity }];
const texts = n => n.findAllWithCriteria({ types: ['TEXT'] });
const isIcon = n => n.type === 'TEXT' && n.fontName !== figma.mixed && n.fontName.family.startsWith('Material');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const sections = page.children.filter(n => n.type === 'SECTION' && THEMES[n.name]);
const screens = () => sections.flatMap(s => s.children.filter(n => n.type === 'FRAME').map(f => ({ f, T: THEMES[s.name], s })));
const mk = (chars, style, size, color, lh) => { const t = figma.createText(); t.fontName = { family: 'Inter', style }; t.fontSize = size; if (lh) t.lineHeight = { unit: 'PERCENT', value: lh }; t.characters = chars; t.fills = solid(color); return t; };
const al = (name, dir, props) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; Object.assign(f, props || {}); return f; };
let _iconSrc = null;
for (const { f } of screens()) { _iconSrc = f.findAll(isIcon).find(n => n.characters === 'task_alt' && n.fontSize === 24 && !f.name.includes('Zadania')); if (_iconSrc) break; }
await figma.loadFontAsync(_iconSrc.fontName);
const icon = (chars, size, color) => { const t = _iconSrc.clone(); t.characters = chars; t.fontSize = size; t.lineHeight = { unit: 'PIXELS', value: size }; t.fills = solid(color); t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.name = chars; return t; };
const setText = async (t, chars) => { if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); t.characters = chars; };
const OVERLAYS = ['Scrim', 'Bottom sheet', 'Kid menu'];
// Po zmianie treści: ramka obejmuje treść (min. 874), elementy pływające (np. „Napisz") jadą razem z dołem.
const refit = f => {
  const main = f.children[1]; if (!main || main.name !== 'Main Content') return;
  if (f.children.some(c => OVERLAYS.includes(c.name))) return; // ekrany o wysokości telefonu
  const h0 = f.height;
  main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
  if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); main.layoutSizingVertical = 'FILL'; }
  const d = f.height - h0;
  if (d) for (const c of f.children) if (c.layoutPositioning === 'ABSOLUTE') c.y += d;
};
const relayout = () => { for (const section of sections) {
  const PAD = 160, LABEL_H = 120, ROW_GAP = 280;
  const frames = section.children.filter(n => n.type === 'FRAME'), labels = section.children.filter(n => n.type === 'TEXT').sort((a, b) => a.y - b.y);
  let y = PAD, right = 0;
  for (const label of labels) { const row = frames.filter(f => Math.abs(f.y - (label.y + LABEL_H)) < 2); label.y = y; y += LABEL_H; let h = 0; for (const f of row) { f.y = y; h = Math.max(h, f.height); right = Math.max(right, f.x + f.width); } y += h + ROW_GAP; }
  section.resizeWithoutConstraints(Math.max(section.width, right + PAD), y - ROW_GAP + PAD);
} };
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
