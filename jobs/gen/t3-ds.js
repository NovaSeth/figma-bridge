//# opis: paczka DS frekwencji - Day ring os Tone, KPI card Show chip + opisy i Doc
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const zm = n => vars.find(v => v.name === n && v.variableCollectionId === cLight.id);
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', zm(n));
const log = { kroki: [] };

// ---------- 1. Day ring: os Tone ----------
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Day ring');
if (!set) throw new Error('brak zestawu Day ring');
for (const c of set.children) if (!/Tone=/.test(c.name)) { c.name = c.name + ', Tone=Neutral'; log.kroki.push('przemianowano ' + c.name); }
const kluczDay = Object.keys(set.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Day');
const TONY = [['Warning', 'color/warning'], ['Error', 'color/error']];
for (const [ton, token] of TONY) {
  const nazwa = 'State=Partial, Tone=' + ton;
  const juz = set.children.find(c => c.name === nazwa);
  if (juz && juz.children.length === 3) { log.kroki.push('jest: ' + nazwa); continue; }
  if (juz) juz.remove();
  const src = set.children.find(c => c.name === 'State=Partial, Tone=Neutral');
  const kl = src.clone();
  kl.name = nazwa;
  set.appendChild(kl);
  kl.resize(44, 44);
  const tor = kl.children.find(c => c.name === 'Track');
  tor.fills = [paint(token)];
  const dzien = kl.children.find(c => c.name === 'Day');
  dzien.componentPropertyReferences = { characters: kluczDay };   // klon gubi referencje
  log.kroki.push('dodano ' + nazwa + ' (tor ' + token + ')');
}
// kolejnosc: Full, Partial N/W/E, Today, None, Empty
['State=Full, Tone=Neutral','State=Partial, Tone=Neutral','State=Partial, Tone=Warning','State=Partial, Tone=Error',
 'State=Today, Tone=Neutral','State=None, Tone=Neutral','State=Empty, Tone=Neutral']
 .forEach((nz, i) => { const c = set.children.find(x => x.name === nz); if (c) set.insertChild(i, c); });
const OPIS_RING = 'Dzień w kalendarzu frekwencji, 44 px. Długość zielonego łuku to udział lekcji, na których dziecko było — ustawia się ją jako override podwarstwy „Arc" na konkretnej instancji (Full = komplet, Partial = ułamek, łuk zerowy = nie było na żadnej lekcji), nigdy nowym wariantem; dlatego nie ma osi „Share" ani stanu „Zero". Ton maluje tę część pierścienia, która obecnością nie jest, i niesie NAJPOWAŻNIEJSZY status dnia, nie dominujący: Error = nieobecność, Warning = spóźnienie, Neutral = zwolnienie. Długość odpowiada więc na „ile", a kolor na „jak źle" — dzień z sześcioma obecnościami i dwiema nieobecnościami nie udaje zielonego, a jedno spóźnienie nie wygląda jak całodniowa nieobecność. Ton ma sens tylko przy Partial: przy Full łuk zakrywa cały pierścień, a Today, None i Empty nie pokazują obecności — zestaw jest z tego powodu celowo niepełny. State=None to szary pierścień bez łuku i znaczy wyłącznie „szkoła nie wpisała frekwencji"; dzień ze zwolnieniem ma zawsze łuk krótszy od pełnego, żeby te dwa szare dni dało się odróżnić. Today przykrywa dane dnia bieżącego — widać je po tapnięciu, w arkuszu.';
set.description = OPIS_RING;
log.wariantyRing = set.children.map(c => c.name + '(' + c.children.length + ')');

// ---------- 2. KPI card: Show chip + zagniezdzony Chip ----------
const kpi = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'KPI card' && (!n.parent || n.parent.type !== 'COMPONENT_SET'));
const chipSet = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
let kluczChip = Object.keys(kpi.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Show chip');
if (!kluczChip) { kluczChip = kpi.addComponentProperty('Show chip', 'BOOLEAN', false); log.kroki.push('dodano Show chip: ' + kluczChip); }
let wrap = kpi.children.find(c => c.name === 'Chip wrap');
if (!wrap) {
  wrap = figma.createFrame();
  wrap.name = 'Chip wrap';
  wrap.layoutMode = 'VERTICAL';
  wrap.itemSpacing = 0;
  wrap.paddingTop = 6; wrap.paddingRight = 0; wrap.paddingBottom = 0; wrap.paddingLeft = 0;
  wrap.fills = [];
  kpi.appendChild(wrap);
  wrap.layoutSizingHorizontal = 'HUG';
  const chip = chipSet.children.find(c => c.name === 'Tone=Error, Size=Default').createInstance();
  chip.name = 'Chip';
  wrap.appendChild(chip);
  wrap.layoutSizingVertical = 'HUG';
  const p = chip.componentProperties || {};
  const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
  const st = {};
  if (k('Label')) st[k('Label')] = '3 bez usprawiedliwienia';
  if (k('Show icon')) st[k('Show icon')] = false;
  chip.setProperties(st);
  chip.isExposedInstance = true;
  log.kroki.push('dodano Chip wrap + Chip');
}
wrap.componentPropertyReferences = { visible: kluczChip };
wrap.visible = true;
const OPIS_KPI = 'Karta wskaźnika dla wybranego okresu (Frekwencja). Wartość zmienia się razem z Date nav nad kartą. Value zostaje zielone niezależnie od wysokości procentu: to kolor metryki „obecność", nie ocena dziecka — progów w rodzaju „poniżej 80% na czerwono" nie wymyślamy. Title podaje mianownik, Detail rozbija resztę, żeby rodzic mógł dodać i się zgodzić (69 + 3 + 1 + 12 = 85). Show chip odsłania pod Detail (8 px) jedną liczbę, która wymaga od rodzica działania — „3 bez usprawiedliwienia", Tone=Error; chip jest wystawiony, więc ton i etykietę ustawia się na instancji karty. Nie wkładać tej liczby do Detail: to stan do załatwienia, a nie kolejne zdanie. Spóźnienie i zwolnienie NIE liczą się u nas do obecności, choć Librus liczy je jako obecność — dlatego nasz procent bywa niższy niż jego i dlatego wszystkie składniki stoją na karcie wprost. Odmiana: 1 nieobecność / 2 nieobecności / 12 nieobecności; 1 spóźnienie / 3 spóźnienia / 19 spóźnień; 1 zwolnienie / 2 zwolnienia / 7 zwolnień; 1 lekcja / 2 lekcje / 85 lekcji, a po przyimku „z" zawsze dopełniacz: „z 85 lekcji".';
kpi.description = OPIS_KPI;

// ---------- 3. Doc na tablicy ----------
const zamienOpis = (docNazwa, nowy) => {
  for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
    const board = sek.children.find(c => c.name === 'Board');
    if (!board) continue;
    const doc = board.children.find(c => c.name === docNazwa);
    if (!doc) continue;
    const t = doc.children.filter(c => c.type === 'TEXT');
    if (t.length >= 2) { t[1].characters = nowy; t[1].name = nowy.slice(0, 60); return 'ok: ' + docNazwa; }
    return 'brak drugiego tekstu w ' + docNazwa;
  }
  return 'nie znaleziono ' + docNazwa;
};
log.kroki.push(zamienOpis('Doc · Day ring', OPIS_RING));
log.kroki.push(zamienOpis('Doc · KPI card', OPIS_KPI));

// ---------- 4. rozpoznanie pod ekrany ----------
const sh = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'Section heading' && (!n.parent || n.parent.type !== 'COMPONENT_SET'));
const div = ds.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === 'Divider');
log.rozpoznanie = {
  sectionHeading: sh ? Math.round(sh.width) + 'x' + Math.round(sh.height) : 'brak',
  divider: div ? div.type + ' ' + Math.round(div.width) + 'x' + Math.round(div.height) + ' props=' + Object.keys(div.componentPropertyDefinitions || {}).join(',') : 'brak',
  kpiPo: Math.round(kpi.width) + 'x' + Math.round(kpi.height),
  kpiDzieci: kpi.children.map(c => c.name + ' ' + Math.round(c.height))
};
const board = ds.children.find(c => c.type === 'SECTION' && c.name === 'Molekuły').children.find(c => c.name === 'Board');
await shot(board.children.find(c => c.name === 'Doc · Day ring'), { scale: 2, name: 't3-doc-day-ring' });
await shot(board.children.find(c => c.name === 'Doc · KPI card'), { scale: 2, name: 't3-doc-kpi' });
return log;
