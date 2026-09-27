//# opis: kolejnosc wariantow Icon tile + opisy komponentow (Icon tile, FAB, Tab item) i wpisy Doc na tablicy
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = [];
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
const chcianaKolejnosc = ['Tone=Primary, Kind=Icon','Tone=Success, Kind=Icon','Tone=Warning, Kind=Icon','Tone=Neutral, Kind=Icon',
  'Tone=Primary, Kind=Value','Tone=Success, Kind=Value','Tone=Warning, Kind=Value','Tone=Neutral, Kind=Value'];
chcianaKolejnosc.forEach((nz, i) => { const c = set.children.find(x => x.name === nz); if (c) set.insertChild(i, c); });
log.push('kolejnosc: ' + set.children.map(c => c.name).join(' | '));

const OPISY = {
  'Icon tile': 'Kwadrat 32 px, jak w Ustawieniach iOS. Kind=Icon: ikona rodzaju informacji. Kind=Value: krótka wartość zamiast ikony (ocena „4", „+", numer lekcji „1") stylem title/md w kolorze treści kafla; wartość dłuższa niż 3 znaki wraca do Kind=Icon z ikoną grading, a pełna wartość idzie na początek tytułu wiersza. Ton niesie rodzaj informacji: Primary = informacja, Success = frekwencja, Warning = ogłoszenia, Neutral = wartość bez rodzaju (ocena, numer lekcji) albo brak danych. Ton nigdy nie ocenia wartości: ocena niedostateczna ma ten sam kafel co celująca.',
  'FAB': 'Przycisk pływający nad listą (jedyny element z cieniem elevation/fab): „Napisz" w Wiadomościach, „Dodaj zajęcia" w Planie. 16 px od prawej krawędzi ekranu i 16 px nad paskiem zakładek — tak stoi na 07 i na 15.',
  'Tab item': 'Pozycja dolnej nawigacji: ikona 24 + etykieta. Aktywna ma tonalną pigułkę (Material 3). Plakietka stoi na „Teraz" (otwarte sprawy wybranego dziecka, więc po przełączeniu dziecka zmienia liczbę) i na „Wiadomościach" (nieprzeczytane w skrzynce rodzica, wspólnej dla gospodarstwa, więc przy zmianie dziecka zostaje bez zmian). Pozostałe zakładki plakietki nie mają.'
};
for (const [nazwa, opis] of Object.entries(OPISY)) {
  const k = ds.findOne(n => (n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && (!n.parent || n.parent.type !== 'COMPONENT_SET'))) && n.name === nazwa);
  if (!k) { log.push('BRAK komponentu ' + nazwa); continue; }
  k.description = opis;
  let zrobione = 'opis ' + nazwa + ': ustawiony, Doc nie znaleziony';
  for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
    const board = sek.children.find(c => c.name === 'Board');
    if (!board) continue;
    const doc = board.children.find(c => c.name === 'Doc · ' + nazwa);
    if (!doc) continue;
    const t = doc.children.filter(c => c.type === 'TEXT');
    if (t.length >= 2) { t[1].characters = opis; t[1].name = opis.slice(0, 60); zrobione = 'opis + Doc · ' + nazwa + ' (sekcja ' + sek.name + ')'; }
    break;
  }
  log.push(zrobione);
}
const board = ds.children.find(c => c.type === 'SECTION' && c.name === 'Atomy').children.find(c => c.name === 'Board');
await shot(board.children.find(c => c.name === 'Doc · Icon tile'), { scale: 2, name: 't2-doc-icon-tile' });
return log;
