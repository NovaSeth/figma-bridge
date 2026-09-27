//# DS P3.d–e: poprawka Chip/Button + Avatar, Badge, Unread dot, Checkbox, Switch, Icon tile, Divider
const { s, b } = await board('Atomy', 2000);
for (const n of ['Chip', 'Button']) for (const c of findComp(n).children) { c.primaryAxisSizingMode = 'AUTO'; }
const out = {};
const circle = (c, size) => { c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(size, size); radius(c, 'full'); };
if (!findComp('Avatar')) {
  const comps = [];
  for (const [size, style] of [[40, 'label-lg'], [44, 'title-lg'], [72, 'headline-lg']]) { const c = figma.createComponent(); c.name = 'Size=' + size; circle(c, size); c.fills = paint('primary-container'); const t = await txt('J', style, 'on-primary-container'); t.name = 'Initial'; c.appendChild(t); comps.push(c); }
  const set = variants('Avatar', comps, 'Awatar z inicjałem na primary-container. 44: dziecko w nagłówku, 40: nadawca wiadomości (dwa inicjały), 72: arkusz zdjęcia. Gdy jest zdjęcie (z Librusa albo własne), wypełnia koło.');
  const k = set.addComponentProperty('Inicjał', 'TEXT', 'J'); for (const c of set.children) c.findOne(n => n.name === 'Initial').componentPropertyReferences = { characters: k };
  await entry(b, 'Avatar', set.description, set); out.avatar = set.id;
}
if (!findComp('Badge')) {
  const c = figma.createComponent(); c.name = 'Badge'; c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.counterAxisSizingMode = 'FIXED'; c.resize(18, 18); c.primaryAxisSizingMode = 'AUTO'; c.minWidth = 18;
  for (const p of ['paddingLeft', 'paddingRight']) c.setBoundVariable(p, V('spacing/xs')); radius(c, 'full'); c.fills = paint('badge');
  const t = await txt('7', 'label-sm', 'on-badge'); t.name = 'Count'; c.appendChild(t); const k = c.addComponentProperty('Liczba', 'TEXT', '7'); t.componentPropertyReferences = { characters: k };
  c.description = 'Licznik: otwarte sprawy na zakładce Teraz, nieprzeczytane na „Odebrane". Tylko prawdziwe liczby.';
  await entry(b, 'Badge', c.description, c); out.badge = c.id;
}
if (!findComp('Unread dot')) {
  const c = figma.createComponent(); c.name = 'Unread dot'; c.resize(8, 8); radius(c, 'full'); c.fills = paint('primary'); c.description = 'Znacznik nieprzeczytanej wiadomości lub ogłoszenia, przed tytułem. Tytuł nieprzeczytany: title-md, przeczytany: title-md-read.';
  await entry(b, 'Unread dot', c.description, c); out.dot = c.id;
}
if (!findComp('Checkbox')) {
  const comps = [];
  for (const on of [false, true]) { const c = figma.createComponent(); c.name = 'Checked=' + (on ? 'True' : 'False'); circle(c, 26); if (on) { c.fills = paint('primary'); c.appendChild(iconInst('check', 16, 'on-primary')); } else { c.fills = []; c.strokes = paint('outline'); c.strokeWeight = 2; c.strokeAlign = 'INSIDE'; } comps.push(c); }
  const set = variants('Checkbox', comps, 'Kółko zadania jak w Google Tasks. Pole dotyku 44 px zapewnia wiersz. Zaznaczenie przekreśla tytuł i przenosi zadanie do „Zrobione".');
  await entry(b, 'Checkbox', set.description, set); out.checkbox = set.id;
}
if (!findComp('Switch')) {
  const comps = [];
  for (const on of [true, false]) { const c = figma.createComponent(); c.name = 'On=' + (on ? 'True' : 'False'); c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisAlignItems = on ? 'MAX' : 'MIN'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(51, 31); c.paddingLeft = c.paddingRight = 2; radius(c, 'full'); c.fills = paint(on ? 'primary' : 'outline'); if (!on) c.opacity = 1; const k = figma.createEllipse(); k.name = 'Knob'; k.resize(27, 27); k.fills = paint('surface'); c.appendChild(k); comps.push(c); }
  const set = variants('Switch', comps, 'Przełącznik ustawień (iOS). Włączony: primary, wyłączony: outline.');
  await entry(b, 'Switch', set.description, set); out.sw = set.id;
}
if (!findComp('Icon tile')) {
  const comps = [];
  for (const [tone, bg, fg, ic] of [['Primary', 'primary', 'on-primary', 'record_voice_over'], ['Success', 'success', 'on-primary', 'event_available'], ['Warning', 'warning-strong', 'on-primary', 'campaign'], ['Neutral', 'neutral-container', 'on-surface-variant', 'grading']]) { const c = figma.createComponent(); c.name = 'Tone=' + tone; c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(32, 32); c.cornerRadius = 9; c.fills = paint(bg); const i = iconInst(ic, 20, fg); i.name = 'Icon'; c.appendChild(i); comps.push(c); }
  const set = variants('Icon tile', comps, 'Kwadrat z ikoną jak w Ustawieniach iOS. Kolor oznacza rodzaj informacji: Primary = informacja, Success = frekwencja, Warning = ogłoszenia, Neutral = brak danych.');
  const k = set.addComponentProperty('Ikona ↔', 'INSTANCE_SWAP', findComp('Icon/grading').id); for (const c of set.children) c.findOne(n => n.name === 'Icon').componentPropertyReferences = { mainComponent: k };
  await entry(b, 'Icon tile', set.description, set); out.tile = set.id;
}
if (!findComp('Divider')) { const c = figma.createComponent(); c.name = 'Divider'; c.resize(338, 1); c.fills = paint('outline-variant'); c.description = 'Separator wierszy w liście, z wcięciem do początku tekstu.'; await entry(b, 'Divider', c.description, c); out.divider = c.id; }
fitSection(s, b);
await shot(b, { name: 'ds-atoms', scale: 0.55 });
return out;
