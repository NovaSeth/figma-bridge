// #16 ekran Frekwencja (bez dolnej nawigacji) + wysokość siatki miesiąca
const errors = [];
for (const { f } of screens()) if (/^17 /.test(f.name)) { try {
  const grid = f.children[1].findOne(n => n.name === 'MonthGrid');
  const h = grid.gridRowSizes.reduce((s, r) => s + r.value, 0);
  grid.resize(grid.width, h);
  const wrap = grid.parent; if (wrap.layoutMode === 'NONE') wrap.resize(wrap.width, grid.y + h); else { try { wrap.layoutSizingVertical = 'FIXED'; wrap.resize(wrap.width, grid.y + h); } catch (e) {} }
  for (const t of texts(f).filter(t => t.characters.includes('Lekcje widać w widoku dnia'))) await setText(t, 'Zadania i wydarzenia pochodzą z danych Librusa.');
  refit(f);
} catch (e) { errors.push(f.name + ': ' + e.message); } }

const light = sections[0], T = THEMES['Jasny motyw'];
const get = p => light.children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
if (!get('02f')) {
  const after = get('02e'), src = get('06 ');
  for (const fr of light.children.filter(n => n.type === 'FRAME' && Math.abs(n.y - after.y) < 2 && n.x > after.x)) fr.x += 522;
  const nf = src.clone(); light.appendChild(nf); nf.name = '02f Teraz · frekwencja'; nf.x = after.x + 522; nf.y = after.y;
}
if (!get('02f').findOne(n => n.name === 'Summary')) {
  const f = get('02f');
  const nav = f.children[f.children.length - 1]; if (nav.name.startsWith('Navigation')) nav.remove();
  const main = f.children[1]; [...main.children].forEach(c => c.remove());
  main.layoutMode = 'VERTICAL'; main.itemSpacing = 0; main.paddingLeft = 16; main.paddingRight = 16; main.paddingTop = 0; main.paddingBottom = 28;
  const add = n => { main.appendChild(n); n.layoutSizingHorizontal = 'FILL'; return n; };
  const backSrcText = texts(get('08 ').children[1]).find(t => t.characters === 'Wiadomości' && t.fontSize === 17);
  let back = backSrcText.parent; while (!(back.type === 'FRAME' && back.findOne(isIcon)) && back.parent) back = back.parent;
  const b = back.clone(); main.appendChild(b); await setText(b.findAllWithCriteria({ types: ['TEXT'] }).find(t => !isIcon(t)), 'Teraz');
  const title = al('Title', 'VERTICAL', { paddingTop: 4, paddingBottom: 12, paddingLeft: 4 }); title.appendChild(mk('Frekwencja', 'Extra Bold', 24, T.ink, 120)); add(title);
  const card = al('Summary', 'VERTICAL', { itemSpacing: 2, paddingTop: 18, paddingBottom: 18, paddingLeft: 20, paddingRight: 20, cornerRadius: 20 }); card.fills = solid(T.card);
  card.appendChild(mk('100%', 'Extra Bold', 40, T.ok, 110));
  card.appendChild(mk('Obecność na 55 z 55 lekcji', 'Semi Bold', 17, T.ink, 135));
  card.appendChild(mk('Wrzesień: 0 nieobecności, 0 spóźnień', 'Regular', 15, T.sec, 135));
  add(card);
  const h2 = al('Heading 2', 'VERTICAL', { paddingTop: 26, paddingBottom: 10, paddingLeft: 4 }); h2.appendChild(mk('Wrzesień', 'Bold', 20, T.ink, 120)); add(h2);
  const list = al('List', 'VERTICAL', { cornerRadius: 20, clipsContent: true }); list.fills = solid(T.card);
  const DAYS = [['czw. 17 wrz', '1–4', 4], ['śr. 16 wrz', '1–5', 5], ['wt. 15 wrz', '6–9', 4], ['pon. 14 wrz', '3–7', 5], ['pt. 11 wrz', '1–5', 5], ['czw. 10 wrz', '1–4', 4], ['śr. 9 wrz', '1–5', 5], ['wt. 8 wrz', '6–9', 4], ['pon. 7 wrz', '3–7', 5], ['pt. 4 wrz', '1–5', 5], ['czw. 3 wrz', '1–4', 4], ['śr. 2 wrz', '1–5', 5]];
  DAYS.forEach(([day, range, n], i) => {
    const r = al('Row', 'HORIZONTAL', { itemSpacing: 12, paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, counterAxisAlignItems: 'CENTER' });
    if (i) { r.strokes = solid(T.sep); r.strokeWeight = 1; r.strokeAlign = 'INSIDE'; r.strokeBottomWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeTopWeight = 1; }
    const col = al('Text', 'VERTICAL', { itemSpacing: 1 }); col.appendChild(mk(day, 'Semi Bold', 17, T.ink, 130)); col.appendChild(mk('Lekcje ' + range + ', obecność na wszystkich', 'Regular', 15, T.sec, 135));
    r.appendChild(col); col.layoutGrow = 1;
    const v = mk(n + ' z ' + n, 'Bold', 15, T.ok); r.appendChild(v);
    list.appendChild(r); r.layoutSizingHorizontal = 'FILL';
  });
  add(list);
  const foot = al('Foot', 'VERTICAL', { paddingTop: 12, paddingLeft: 4, paddingRight: 4 }); const ft = mk('Nieobecności i spóźnienia pojawią się na tej liście z nazwą rodzaju wpisu z Librusa.', 'Regular', 13, T.sec, 145); foot.appendChild(ft); add(foot); ft.layoutSizingHorizontal = 'FILL'; ft.textAutoResize = 'HEIGHT';
  main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
}
relayout();
await shot(get('02f'), { name: 'v-02f', scale: 0.7 });
const m = get('17 '); await shot(m.children[1].findOne(n => n.name === 'MonthGrid').parent, { name: 'v-17grid', scale: 0.6 });
return { errors };
