//# opis: #102 ekrany pelnoekranowe z X zamiast strzalki wstecz
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  // wzorzec paska przykrywajacego z tej samej sekcji
  const zrodlo = sek.children.find(x => x.name === '02g Teraz · ustawienia');
  const wzor = zrodlo && zrodlo.findOne(n => n.type === 'INSTANCE' && n.name === 'Cover top bar');
  if (!wzor) { log.push({ sekcja: sek.name, blad: 'brak wzorca' }); continue; }
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    const main = f.children.find(c => c.name === 'Main Content');
    if (!main) continue;
    if (main.findOne(n => n.type === 'INSTANCE' && n.name === 'Cover top bar')) continue;
    const strzalka = main.findOne(n => n.name === 'Icon/arrow_back');
    if (!strzalka) continue;
    // blok naglowka to bezposrednie dziecko Main Content zawierajace strzalke
    let blok = strzalka; while (blok.parent !== main) blok = blok.parent;
    const idx = main.children.indexOf(blok);
    // tytul ekranu to pierwszy duzy tekst w nastepnym bloku
    const nastepny = main.children[idx + 1];
    let tytul = null;
    if (nastepny && nastepny.findAll) {
      const t = nastepny.findAll(n => n.type === 'TEXT')[0];
      if (t && t.fontSize >= 22) tytul = t;
    }
    const nazwa = tytul ? tytul.characters : f.name.replace(/^\d+[a-z]? /, '').split(' · ').pop();
    const pasek = wzor.clone();
    main.insertChild(idx, pasek);
    pasek.layoutSizingHorizontal = 'FILL';
    const tt = pasek.findOne(n => n.type === 'TEXT');
    if (tt) { try { tt.characters = nazwa; } catch (e) { log.push({ blad: e.message }); } }
    blok.remove();
    if (tytul) { let b2 = tytul; while (b2.parent !== main) b2 = b2.parent; b2.remove(); }
    log.push({ sekcja: sek.name, screen: f.name, tytul: nazwa });
  }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const n of ['08 Wiadomość · wątek', '13 Nowa wiadomość']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.7, name: 'vE3-' + n.split(' ')[0] });
}
return log;
