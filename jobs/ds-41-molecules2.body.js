//# DS P3: molekuły, część 2 + poprawki Action card i Summary card
const { s, b } = await board('Molekuły', 3300);
const out = {}; const grow = n => { n.layoutGrow = 1; return n; };
// poprawki
const card = findComp('Action card');
for (const v of card.children) { const act = v.findOne(n => n.name === 'Actions'); if (act.layoutMode === 'VERTICAL') continue; const kids = [...act.children]; act.layoutWrap = 'NO_WRAP'; act.layoutMode = 'VERTICAL'; act.setBoundVariable('itemSpacing', V('spacing/sm'));
  const r1 = box('Row', 'HORIZONTAL', { gap: 'sm' }); act.appendChild(r1); fillW(r1); r1.appendChild(kids[0]); kids[0].layoutGrow = 1; r1.appendChild(kids[1]); if (kids[2]) { const r2 = box('Row', 'HORIZONTAL', { gap: 'sm' }); act.appendChild(r2); r2.appendChild(kids[2]); } }
const track = findComp('Summary card').findOne(n => n.name === 'Progress'); track.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.14 }, 'color', V('color/on-primary-container'))];

if (!findComp('Segmented control')) {
  const comps = [];
  for (const n of [2, 3, 4]) { const c = comp('Segments=' + n, 'HORIZONTAL', { gap: '2xs', fill: 'neutral-container', radius: 'md' }); c.paddingTop = c.paddingBottom = c.paddingLeft = c.paddingRight = 2; fixedW(c, 370);
    const labels = { 2: ['Odebrane', 'Wysłane'], 3: ['Systemowy', 'Jasny', 'Ciemny'], 4: ['Dzień', 'Tydzień', 'Miesiąc', 'Rok'] }[n];
    labels.forEach((l, i) => { const seg = box('Segment', 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); seg.counterAxisSizingMode = 'FIXED'; seg.resize(80, 44); seg.setBoundVariable('height', V('size/touch')); seg.cornerRadius = 10; if (!i) seg.fills = paint('surface'); c.appendChild(seg); grow(seg); seg.appendChild(null || figma.createText()); });
    for (const [i, seg] of c.children.entries()) { const t = seg.children[0]; await t.setTextStyleIdAsync(TS('label-md').id); t.characters = labels[i]; t.fills = paint(i ? 'on-surface-variant' : 'on-surface'); }
    comps.push(c); }
  const set = variants('Segmented control', comps, 'Przełącznik widoków (iOS): foldery poczty, widoki kalendarza, motyw, Miesiąc/Rok we frekwencji. Aktywny segment: surface. Licznik nieprzeczytanych to Badge obok etykiety.');
  await entry(b, 'Segmented control', set.description, set); out.seg = set.id;
}
if (!findComp('Tab item')) {
  const comps = [];
  for (const on of [true, false]) { const c = comp('Active=' + (on ? 'True' : 'False'), 'VERTICAL', { gap: '2xs', counterAxisAlignItems: 'CENTER' }); c.counterAxisSizingMode = 'FIXED'; c.resize(72, 52); c.primaryAxisSizingMode = 'AUTO';
    const pill = box('Pill', 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); pill.primaryAxisSizingMode = 'FIXED'; pill.counterAxisSizingMode = 'FIXED'; pill.resize(56, 30); radius(pill, 'full'); if (on) pill.fills = paint('primary-container');
    const ic = iconInst('home', 24, on ? 'on-primary-container' : 'on-surface-variant'); ic.name = 'Icon'; pill.appendChild(ic); c.appendChild(pill);
    const t = await txt('Teraz', 'label-sm', on ? 'on-surface' : 'on-surface-variant'); t.name = 'Label'; c.appendChild(t); comps.push(c); }
  const set = variants('Tab item', comps, 'Pozycja dolnej nawigacji: ikona 24 + etykieta. Aktywna ma tonalną pigułkę (Material 3). Licznik (Badge) tylko na Teraz i tylko dla otwartych spraw.');
  const k1 = set.addComponentProperty('Etykieta', 'TEXT', 'Teraz'), k2 = set.addComponentProperty('Ikona ↔', 'INSTANCE_SWAP', findComp('Icon/home').id);
  for (const c of set.children) { c.findOne(n => n.name === 'Label').componentPropertyReferences = { characters: k1 }; c.findOne(n => n.name === 'Icon').componentPropertyReferences = { mainComponent: k2 }; }
  await entry(b, 'Tab item', set.description, set); out.tab = set.id;
}
progress(0.5, 'Text field, Banner, Date nav');
if (!findComp('Text field')) {
  const comps = [];
  for (const [state, stroke, w] of [['Default', 'outline', 1.5], ['Focus', 'primary', 2], ['Error', 'error', 1.5]]) { const c = comp('State=' + state, 'VERTICAL', { gap: 'xs' }); fixedW(c, 338);
    const l = await txt('Temat', 'label-lg'); l.name = 'Label'; c.appendChild(l);
    const inp = box('Input', 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', fill: 'background', radius: 'lg' }); inp.paddingLeft = inp.paddingRight = 14; inp.counterAxisSizingMode = 'FIXED'; inp.resize(338, 48); inp.strokes = paint(stroke); inp.strokeWeight = w; inp.strokeAlign = 'INSIDE'; c.appendChild(inp); fillW(inp);
    const v = await txt(state === 'Error' ? '' : 'np. koniki, angielski', 'body-md', 'on-surface-variant'); v.name = 'Value'; if (state !== 'Error') inp.appendChild(v); else { v.characters = ' '; inp.appendChild(v); }
    if (state === 'Error') { const e = await txt('Wpisz temat.', 'label-md', 'error'); e.name = 'Error'; c.appendChild(e); }
    comps.push(c); }
  const set = variants('Text field', comps, 'Pole formularza 48 px. Etykieta zawsze widoczna nad polem. Błąd opisany tekstem pod polem, fokus przechodzi na pierwsze błędne pole.');
  await entry(b, 'Text field', set.description, set); out.field = set.id;
}
if (!findComp('Banner')) {
  const c = comp('Banner', 'HORIZONTAL', { pad: ['md', 'lg'], fill: 'success-container', radius: 'lg' }); fixedW(c, 370);
  const t = await txt('Nie udało się odświeżyć. Pokazujemy ostatnie poprawne dane z 18.09.2026.', 'label-lg', 'on-success-container'); t.name = 'Text'; c.appendChild(t); grow(t); t.textAutoResize = 'HEIGHT';
  const k = c.addComponentProperty('Tekst', 'TEXT', t.characters); t.componentPropertyReferences = { characters: k };
  c.description = 'Komunikat stanu nad treścią (odświeżanie, błąd z ostatnimi poprawnymi danymi, potwierdzenie). Mówi, co się stało i co dalej. Nigdy nie wspomina o prototypie ani symulacji.';
  await entry(b, 'Banner', c.description, c); out.banner = c.id;
}
if (!findComp('Date nav')) {
  const c = comp('Date nav', 'HORIZONTAL', { gap: '2xs', counterAxisAlignItems: 'CENTER' });
  const btn = name => { const x = box('Button', 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); x.primaryAxisSizingMode = 'FIXED'; x.counterAxisSizingMode = 'FIXED'; x.resize(44, 44); x.appendChild(iconInst(name, 24, 'on-surface')); return x; };
  c.appendChild(btn('chevron_left')); const t = await txt('Wrzesień 2026', 'headline-sm'); t.name = 'Title'; c.appendChild(t); c.appendChild(btn('chevron_right'));
  const k = c.addComponentProperty('Okres', 'TEXT', 'Wrzesień 2026'); t.componentPropertyReferences = { characters: k };
  c.description = 'Nawigacja po okresie: strzałki po lewej i prawej stronie daty. Używana w Planie i we Frekwencji (nad kartą KPI, która zmienia się z miesiącem).';
  await entry(b, 'Date nav', c.description, c); out.datenav = c.id;
}
fitSection(s, b);
await shot(b, { name: 'ds-molecules', scale: 0.5 });
return out;
