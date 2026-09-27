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
