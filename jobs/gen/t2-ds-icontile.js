//# opis: Icon tile - os Kind (Icon/Value) + wlasciwosc Value, plus poprawki opisow FAB i Tab item
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const style = {}; (await figma.getLocalTextStylesAsync()).forEach(s => style[s.name] = s);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const zm = n => vars.find(v => v.name === n && v.variableCollectionId === cLight.id);
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', zm(n));
const log = { kroki: [] };

// ---------- 1. Icon tile: os Kind ----------
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
if (!set) throw new Error('brak zestawu Icon tile');
const TONY = [
  { t: 'Primary',  kolor: 'color/on-primary',          wart: '4' },
  { t: 'Success',  kolor: 'color/on-success',          wart: '5' },
  { t: 'Warning',  kolor: 'color/on-primary',          wart: '3' },
  { t: 'Neutral',  kolor: 'color/on-surface',          wart: '4' }
];
let maKind = set.children.some(c => /Kind=/.test(c.name));
let klucz = Object.keys(set.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Value');
if (!maKind) {
  for (const c of set.children) if (!/Kind=/.test(c.name)) c.name = c.name + ', Kind=Icon';
  log.kroki.push('przemianowano ' + set.children.length + ' wariantow na Kind=Icon');
}
if (!klucz) {
  klucz = set.addComponentProperty('Value', 'TEXT', '4');
  log.kroki.push('dodano wlasciwosc tekstowa Value: ' + klucz);
}
for (const { t, kolor, wart } of TONY) {
  const nazwa = 'Tone=' + t + ', Kind=Value';
  if (set.children.some(c => c.name === nazwa)) { log.kroki.push('juz jest: ' + nazwa); continue; }
  const src = set.children.find(c => c.name === 'Tone=' + t + ', Kind=Icon');
  if (!src) { log.kroki.push('BRAK zrodla dla ' + nazwa); continue; }
  const kl = src.clone();
  kl.name = nazwa;
  for (const ch of kl.children.slice()) ch.remove();
  const txt = figma.createText();
  txt.name = 'Value';
  txt.characters = wart;
  await txt.setTextStyleIdAsync(style['title/md'].id);
  txt.fills = [paint(kolor)];
  txt.textAlignHorizontal = 'CENTER';
  txt.textAlignVertical = 'CENTER';
  txt.textAutoResize = 'WIDTH_AND_HEIGHT';
  kl.appendChild(txt);
  txt.componentPropertyReferences = { characters: klucz };   // klon gubi referencje - przypisujemy jawnie
  set.appendChild(kl);
  kl.layoutSizingHorizontal = 'FIXED';
  kl.layoutSizingVertical = 'FIXED';
  kl.resize(32, 32);
  log.kroki.push('dodano ' + nazwa);
}
// referencje w wariantach Kind=Icon - upewnij sie, ze ikona nadal wskazuje wlasciwosc Icon
const kluczIkony = Object.keys(set.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Icon');
for (const c of set.children.filter(x => /Kind=Icon/.test(x.name))) {
  const ik = c.children.find(x => x.type === 'INSTANCE');
  if (ik && kluczIkony && (!ik.componentPropertyReferences || ik.componentPropertyReferences.mainComponent !== kluczIkony)) {
    ik.componentPropertyReferences = Object.assign({}, ik.componentPropertyReferences, { mainComponent: kluczIkony });
    log.kroki.push('naprawiono referencje ikony w ' + c.name);
  }
}
const OPIS_TILE = 'Kwadrat 32 px, jak w Ustawieniach iOS. Kind=Icon: ikona rodzaju informacji. Kind=Value: krótka wartość zamiast ikony (ocena „4", „+", numer lekcji „1"), stylem title/md w kolorze treści kafla; wartość dłuższa niż 3 znaki wraca do Kind=Icon z ikoną grading, a pełny tekst idzie na początek tytułu wiersza. Ton niesie rodzaj: Primary = informacja, Success = frekwencja, Warning = ogłoszenia, Neutral = wartość neutralna (ocena, numer) albo brak ikony rodzaju. Ton nigdy nie ocenia wartości: ocena niedostateczna ma ten sam kafel co celująca.';
set.description = OPIS_TILE;
log.kroki.push('opis Icon tile zaktualizowany');
log.wariantyPo = set.children.map(c => c.name);

// ---------- 2. Doc na tablicy ----------
const zamienOpis = (docNazwa, nowy) => {
  for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
    const board = sek.children.find(c => c.name === 'Board');
    if (!board) continue;
    const doc = board.children.find(c => c.name === docNazwa);
    if (!doc) continue;
    const t = doc.children.filter(c => c.type === 'TEXT');
    if (t.length >= 2) { t[1].characters = nowy; t[1].name = nowy.slice(0, 80); return 'ok: ' + docNazwa; }
    return 'brak drugiego tekstu w ' + docNazwa;
  }
  return 'nie znaleziono ' + docNazwa;
};
log.kroki.push(zamienOpis('Doc · Icon tile', OPIS_TILE));

// ---------- 3. FAB: opis zgodny z geometria (zmierzone 16 px na 15 i 07) ----------
const fab = ds.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === 'FAB');
const OPIS_FAB = 'Przycisk pływający nad listą (jedyny element z cieniem elevation/fab): „Napisz" w Wiadomościach, „Dodaj zajęcia" w Planie. 16 px od prawej krawędzi ekranu i 16 px nad paskiem zakładek — tak stoi na 07 i na 15.';
if (fab) { fab.description = OPIS_FAB; log.kroki.push(zamienOpis('Doc · FAB', OPIS_FAB)); }

// ---------- 4. Tab item: plakietka legalna takze na Wiadomosciach ----------
const ti = ds.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === 'Tab item');
const OPIS_TI = 'Pozycja dolnej nawigacji: ikona 24 + etykieta. Aktywna ma tonalną pigułkę (Material 3). Plakietka stoi na „Teraz" (otwarte sprawy wybranego dziecka, więc zmienia się razem z dzieckiem) i na „Wiadomościach" (nieprzeczytane w skrzynce rodzica, wspólne dla całego gospodarstwa, więc po przełączeniu dziecka zostaje bez zmian). Pozostałe zakładki plakietki nie mają.';
if (ti) { ti.description = OPIS_TI; log.kroki.push(zamienOpis('Doc · Tab item', OPIS_TI)); }

await shot(ds.children.find(c => c.type === 'SECTION' && c.name === 'Atomy').children.find(c => c.name === 'Board').children.find(c => c.name === 'Doc · Icon tile'), { scale: 1.5, name: 't2-doc-icon-tile' });
return log;
