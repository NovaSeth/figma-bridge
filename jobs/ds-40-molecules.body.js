//# DS P3: molekuły
const { s, b } = await board('Molekuły', 3300);
const out = {};
const grow = n => { n.layoutGrow = 1; return n; };
if (!findComp('Section heading')) {
  const c = comp('Section heading', 'VERTICAL', { gap: '2xs' }); c.paddingLeft = 4; fixedW(c, 370);
  const t = await txt('Wymaga Twojego działania', 'title-lg'); t.name = 'Title'; c.appendChild(t); const sub = await txt('3 dotyczą klasy Julii, 1 nieprzeczytane', 'body-sm', 'on-surface-variant'); sub.name = 'Subtitle'; c.appendChild(sub);
  const k1 = c.addComponentProperty('Tytuł', 'TEXT', 'Wymaga Twojego działania'), k2 = c.addComponentProperty('Podtytuł', 'BOOLEAN', false), k3 = c.addComponentProperty('Tekst podtytułu', 'TEXT', '3 dotyczą klasy Julii, 1 nieprzeczytane');
  t.componentPropertyReferences = { characters: k1 }; sub.componentPropertyReferences = { visible: k2, characters: k3 };
  c.description = 'Nagłówek sekcji ekranu. Sekcje Teraz w kolejności: Wymaga Twojego działania, Po terminie, Warto wiedzieć, Ogłoszenia. Podtytuł to jedno zdanie policzone z danych.';
  await entry(b, 'Section heading', c.description, c); out.heading = c.id;
}
if (!findComp('List row')) {
  const comps = [];
  for (const lead of ['None', 'Icon tile', 'Avatar', 'Checkbox']) {
    const c = comp('Leading=' + lead, 'HORIZONTAL', { gap: 'md', pad: ['md', 'lg'], fill: 'surface' }); fixedW(c, 370); c.counterAxisAlignItems = 'MIN';
    if (lead !== 'None') { const l = lead === 'Icon tile' ? inst('Icon tile', 'Tone=Primary') : lead === 'Avatar' ? inst('Avatar', 'Size=40') : inst('Checkbox', 'Checked=False'); l.name = 'Leading'; c.appendChild(l); }
    const col = box('Text', 'VERTICAL', { gap: '2xs' }); c.appendChild(col); grow(col);
    const tr = box('Title row', 'HORIZONTAL', { gap: 'sm', counterAxisAlignItems: 'CENTER' }); col.appendChild(tr); const dot = inst('Unread dot'); dot.name = 'Unread'; tr.appendChild(dot);
    const t = await txt('Sprzątanie Świata', 'title-md'); t.name = 'Title'; tr.appendChild(t);
    const sub = await txt('Cała szkoła, worki i rękawiczki. I. Ignaczak', 'body-sm', 'on-surface-variant'); sub.name = 'Subtitle'; col.appendChild(sub); fillW(sub); sub.textAutoResize = 'HEIGHT';
    const chips = box('Chips', 'HORIZONTAL', { gap: 'xs' }); chips.paddingTop = 5; col.appendChild(chips); const ch = inst('Chip', 'Tone=Neutral'); setProp(ch, 'Label', 'dziś'); chips.appendChild(ch);
    const val = await txt('100%', 'headline-sm', 'success'); val.name = 'Value'; c.appendChild(val);
    const cw = box('Chevron', 'VERTICAL', { primaryAxisAlignItems: 'CENTER' }); cw.appendChild(iconInst('chevron_right', 24, 'on-surface-variant')); c.appendChild(cw); cw.layoutSizingVertical = 'FILL';
    comps.push(c);
  }
  const set = variants('List row', comps, 'Wiersz listy w karcie (iOS inset grouped). Szewron jest zawsze wyśrodkowany w pionie i pojawia się tylko, gdy wiersz dokądś prowadzi. Data to chip pod tekstem, nie dopisek przy tytule. Nieprzeczytane: kropka + title-md; przeczytane: bez kropki, title-md-read.');
  const k = { t: set.addComponentProperty('Tytuł', 'TEXT', 'Sprzątanie Świata'), s: set.addComponentProperty('Podtytuł', 'TEXT', 'Cała szkoła, worki i rękawiczki. I. Ignaczak'), u: set.addComponentProperty('Nieprzeczytane', 'BOOLEAN', false), c: set.addComponentProperty('Chipy', 'BOOLEAN', true), v: set.addComponentProperty('Wartość', 'BOOLEAN', false), vt: set.addComponentProperty('Tekst wartości', 'TEXT', '100%'), ch: set.addComponentProperty('Szewron', 'BOOLEAN', true) };
  for (const c of set.children) { c.findOne(n => n.name === 'Title').componentPropertyReferences = { characters: k.t }; c.findOne(n => n.name === 'Subtitle').componentPropertyReferences = { characters: k.s }; c.findOne(n => n.name === 'Unread').componentPropertyReferences = { visible: k.u }; c.findOne(n => n.name === 'Chips').componentPropertyReferences = { visible: k.c }; c.findOne(n => n.name === 'Value').componentPropertyReferences = { visible: k.v, characters: k.vt }; c.findOne(n => n.name === 'Chevron').componentPropertyReferences = { visible: k.ch }; }
  await entry(b, 'List row', set.description, set); out.row = set.id;
}
progress(0.3, 'Action card, Summary card');
if (!findComp('Action card')) {
  const comps = [];
  for (const kind of ['Task', 'Message']) {
    const c = comp('Kind=' + kind, 'VERTICAL', { gap: 'md', pad: ['lg', 'lg'], fill: 'surface', radius: 'xl' }); fixedW(c, 370);
    const chips = box('Chips', 'HORIZONTAL', { gap: 'xs' }); c.appendChild(chips);
    const c1 = inst('Chip', kind === 'Task' ? 'Tone=Warning' : 'Tone=Neutral'); setProp(c1, 'Label', kind === 'Task' ? 'Po terminie · pt. 11 wrz' : 'dziś 15:13'); if (kind === 'Task') setProp(c1, 'Ikona końcowa', true); chips.appendChild(c1);
    const c2 = inst('Chip', 'Tone=Neutral'); setProp(c2, 'Label', kind === 'Task' ? 'Zadanie' : 'Wychowawczyni'); setProp(c2, 'Ikona', false); chips.appendChild(c2);
    const col = box('Text', 'VERTICAL', { gap: '2xs' }); c.appendChild(col); fillW(col);
    const t = await txt(kind === 'Task' ? 'Nazwy obrazków: podziel na sylaby (zeszyt)' : 'Julia od 2 dni nie ma małych zielonych ćwiczeń', 'title-md'); t.name = 'Title'; col.appendChild(t); fillW(t); t.textAutoResize = 'HEIGHT';
    const m = await txt(kind === 'Task' ? 'Edukacja polonistyczna' : 'Joanna Osęka-Więcławicz', 'body-sm', 'on-surface-variant'); m.name = 'Meta'; col.appendChild(m);
    const act = box('Actions', 'HORIZONTAL', { gap: 'sm', layoutWrap: 'WRAP' }); act.counterAxisSpacing = 8; c.appendChild(act); fillW(act);
    const p = inst('Button', 'Style=Primary'); setProp(p, 'Label', kind === 'Task' ? 'Zrobione' : 'Ogarnięte'); act.appendChild(p); grow(p);
    const d = inst('Button', 'Style=Secondary'); setProp(d, 'Label', 'Szczegóły'); act.appendChild(d);
    if (kind === 'Message') { const r = inst('Button', 'Style=Secondary'); setProp(r, 'Label', 'Odpowiedz'); setProp(r, 'Ikona', true); act.appendChild(r); }
    comps.push(c);
  }
  const set = variants('Action card', comps, 'Karta sprawy wymagającej rodzica. Jedna akcja główna („Zrobione" / „Ogarnięte"), „Szczegóły" otwiera arkusz dolny, „Odpowiedz" otwiera okno odpowiedzi. Rola nadawcy i termin to chipy.');
  await entry(b, 'Action card', set.description, set); out.card = set.id;
}
if (!findComp('Summary card')) {
  const c = comp('Summary card', 'VERTICAL', { gap: 'xs', pad: ['md', 'lg'], fill: 'primary-container', radius: '2xl' }); fixedW(c, 370);
  const lead = await txt('7 spraw do załatwienia', 'headline-sm', 'on-primary-container'); lead.name = 'Lead'; c.appendChild(lead);
  const sub = await txt('Julia od 2 dni nie ma małych zielonych ćwiczeń', 'body-md', 'summary-secondary'); sub.name = 'Sub'; c.appendChild(sub); fillW(sub); sub.textAutoResize = 'HEIGHT';
  const track = box('Progress', 'HORIZONTAL', {}); track.counterAxisSizingMode = 'FIXED'; track.resize(338, 6); radius(track, 'full'); track.fills = [Object.assign({}, paint('on-primary-container')[0], { opacity: 0.14 })]; const wrap = box('Progress wrap', 'VERTICAL', {}); wrap.paddingTop = 10; wrap.appendChild(track); c.appendChild(wrap); fillW(wrap); fillW(track);
  const bar = figma.createFrame(); bar.name = 'Bar'; bar.resize(96, 6); radius(bar, 'full'); bar.fills = paint('primary'); track.appendChild(bar);
  const count = await txt('2 z 7 zamknięte (zrobione lub archiwum)', 'label-md', 'summary-secondary'); count.name = 'Count'; c.appendChild(count);
  const k1 = c.addComponentProperty('Zdanie', 'TEXT', '7 spraw do załatwienia'), k2 = c.addComponentProperty('Szczegół', 'TEXT', 'Julia od 2 dni nie ma małych zielonych ćwiczeń'), k3 = c.addComponentProperty('Postęp', 'TEXT', '2 z 7 zamknięte (zrobione lub archiwum)');
  lead.componentPropertyReferences = { characters: k1 }; sub.componentPropertyReferences = { characters: k2 }; count.componentPropertyReferences = { characters: k3 };
  c.description = 'Jedyny akcent kolorystyczny ekranu Teraz: tonalna karta z odpowiedzią policzoną z danych i prawdziwym postępem. Nie czarna: czerń jest zarezerwowana dla przycisku głównego.';
  await entry(b, 'Summary card', c.description, c); out.summary = c.id;
}
fitSection(s, b);
await shot(b, { name: 'ds-molecules-1', scale: 0.5 });
return out;
