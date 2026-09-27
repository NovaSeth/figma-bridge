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
// #14 #22 #25 #26 #27 #28 teksty + #11 #12 #13 arkusze
const topWrapper = n => { while (n.parent && n.parent.type === 'FRAME' && n.parent.children.length === 1 && n.parent.name !== 'Main Content') n = n.parent; return n; };
const EXACT = {
  'Wymaga Ciebie': 'Wymaga Twojego działania',
  'Symuluj odpowiedź': 'Wyślij', 'Symuluj wysłanie': 'Wyślij',
  'Symulacja odświeżania. Nadal widzisz ostatnie poprawne dane.': 'Odświeżam. Nadal widzisz ostatnie poprawne dane.',
  'Symulacja: odświeżanie nieudane. Pokazujemy ostatnie poprawne dane z 18.09.2026.': 'Nie udało się odświeżyć. Pokazujemy ostatnie poprawne dane z 18.09.2026.',
  'Lekcje (plan przykładowy)': 'Lekcje',
  'Historia korespondencji': 'Poprzednie wiadomości od tej osoby', 'Wcześniej od tej osoby': 'Poprzednie wiadomości od tej osoby',
  'Przykład: pojawi się, gdy konto rodzica ma więcej dzieci': 'klasa 4, SP Łady',
};
const REMOVE = [/^Prototyp: wysłane wiadomości/, /^Odpowiedź zapisana w symulacji/];
const log = {};
const bump = k => { log[k] = (log[k] || 0) + 1; };
for (const { f, T } of screens()) {
  for (const t of texts(f)) {
    if (t.removed) continue;
    const c = t.characters;
    if (REMOVE.some(r => r.test(c))) { topWrapper(t).remove(); bump('removed'); continue; }
    let n = EXACT[c];
    if (!n && c.startsWith('Prototyp nie zawiera ocen')) n = 'Julia nie ma jeszcze ocen. W klasie 1 mogą to być oceny opisowe. Pokażemy treść oceny, obszar edukacji, datę i nauczyciela; nie wyliczamy średniej z opisów.';
    if (!n && c.startsWith('Szkic zostaje')) n = 'Szkic zostaje, dopóki nie wyślesz wiadomości.';
    if (!n && c.startsWith('Treści ') && c.includes('prototypie')) n = 'Pozostałe ogłoszenia dotyczą innych klas.';
    if (!n && c.startsWith('Plan lekcji jest przykładowy')) n = 'Zadania i wydarzenia pochodzą z danych Librusa.' + (c.includes('Lekcje widać') ? ' Lekcje widać w widoku dnia i tygodnia.' : '');
    if (!n && c.includes(' (plan przykładowy)')) n = c.replace(' (plan przykładowy)', '');
    if (n != null && n !== c) { await setText(t, n); bump('text'); }
  }
  // #26: informacja o odpowiedziach pod nagłówkiem historii
  for (const h of texts(f).filter(t => t.characters === 'Poprzednie wiadomości od tej osoby')) {
    const w = topWrapper(h), box = w.parent;
    if (box.children.some(c => c.name === 'History sub')) continue;
    const sub = al('History sub', 'VERTICAL', { paddingTop: 4, paddingLeft: box.name === 'Body' ? 0 : 4, paddingRight: 4 });
    const st = mk('2 wiadomości, na żadną nie odpowiedziano', 'Regular', 15, T.sec, 135);
    sub.appendChild(st); box.insertChild(box.children.indexOf(w) + 1, sub); sub.layoutSizingHorizontal = 'FILL'; st.layoutSizingHorizontal = 'FILL'; st.textAutoResize = 'HEIGHT'; bump('history-sub');
  }
  // drugie dziecko na liście: inicjał zamiast plusa
  for (const t of texts(f).filter(t => t.characters === '+' && t.parent.name === 'Avatar')) await setText(t, 'D');

  const sheet = f.children.find(c => c.name === 'Bottom sheet');
  if (sheet) {
    const bar = sheet.findOne(n => n.name === 'Bar'), body = sheet.findOne(n => n.name === 'Body'), actions = sheet.findOne(n => n.name === 'Actions');
    const close = bar && texts(bar).find(t => t.characters === 'Zamknij'); if (close) { close.remove(); bump('zamknij'); }          // #11
    for (const t of texts(sheet)) if (t.characters === 'Joanna Osęka-Więcławicz, wychowawczyni') { await setText(t, 'Joanna Osęka-Więcławicz'); bump('rola'); } // #12
    const to = texts(sheet).find(t => t.characters === 'Joanna Osęka-Więcławicz (wychowawczyni)');
    if (to) {
      const rowTo = to.parent, chipSrc = page.findOne(n => n.type === 'FRAME' && n.cornerRadius === 8 && texts(n).some(x => x.characters === 'Wychowawczyni') && !n.removed);
      const col = al('Value', 'VERTICAL', { itemSpacing: 6 });
      rowTo.appendChild(col); col.layoutGrow = 1;
      col.appendChild(to); await setText(to, 'Joanna Osęka-Więcławicz'); to.layoutSizingHorizontal = 'FILL';
      if (chipSrc) col.appendChild(chipSrc.clone());
      bump('rola-tag');
    }
    if (actions) { for (const b of actions.children) { b.layoutSizingVertical = 'FIXED'; b.resize(b.width, 44); } }                 // #13
    const full = /^02[ab]/.test(f.name), target = full ? 874 - 52 : Math.round(874 * 0.64);
    body.layoutSizingVertical = 'HUG';
    const rest = 44 + (bar && !bar.removed ? bar.height : 0) + (actions ? actions.height : 0);
    if (full || sheet.height > target) { body.layoutSizingVertical = 'FIXED'; body.resize(body.width, target - rest); }
    sheet.y = f.height - sheet.height;
  }
  refit(f);
}
relayout();
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('02 '), { name: 'v-02', scale: 1 });
await shot(get('02b'), { name: 'v-02b', scale: 1 });
await shot(get('08 '), { name: 'v-08', scale: 1 });
return log;
