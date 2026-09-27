//# opis: 06a Oceny - oceny cyfrowe (klon 05, Icon tile Kind=Value), oba motywy
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => S[s.name] = s);
const zestaw = n => ds.findOne(x => x.type === 'COMPONENT_SET' && x.name === n);
const komp = n => ds.findOne(x => x.type === 'COMPONENT' && x.name === n && (!x.parent || x.parent.type !== 'COMPONENT_SET'));
const setListRow = zestaw('List row'), setSeg = zestaw('Segmented control'), setDisc = zestaw('Disclosure');
const kompQuote = komp('Quote'), kompSH = komp('Section heading');
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color'), cDark = kol.find(c => c.name === 'Color Dark');
const nazwaJasnej = {}, ciemnaPoNazwie = {};
for (const v of vars) { if (v.variableCollectionId === cLight.id) nazwaJasnej[v.id] = v.name; if (v.variableCollectionId === cDark.id) ciemnaPoNazwie[v.name] = v; }
const zmJ = n => vars.find(v => v.name === n && v.variableCollectionId === cLight.id);
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', zmJ(n));
const naCiemny = (root) => {
  const przep = lista => { let z = false; const n = lista.map(p => { const b = p.boundVariables && p.boundVariables.color; if (!b) return p; const nm = nazwaJasnej[b.id]; if (!nm || !ciemnaPoNazwie[nm]) return p; z = true; return figma.variables.setBoundVariableForPaint(p, 'color', ciemnaPoNazwie[nm]); }); return z ? n : null; };
  for (const n of root.findAll(() => true).concat([root])) {
    if ('fills' in n && n.fills && n.fills !== figma.mixed && n.fills.length) { const x = przep(n.fills); if (x) try { n.fills = x; } catch (e) {} }
    if ('strokes' in n && n.strokes && n.strokes.length) { const x = przep(n.strokes); if (x) try { n.strokes = x; } catch (e) {} }
  }
};
const ustaw = (inst, mapa) => {
  const p = inst.componentProperties || {}; const out = {};
  for (const [nz, w] of Object.entries(mapa)) { const k = Object.keys(p).find(y => y.split('#')[0] === nz); if (k) out[k] = w; }
  if (Object.keys(out).length) inst.setProperties(out);
};
// ---- dane ekranu ----
const OCENY = {
  'Język polski': { sub: 'Średnia 3,73, 5 ocen', w: [
    { v: '4', chip: 'dziś', ton: 'Success', nowe: true,  t: 'Kartkówka, części mowy', s: 'Waga 3, Wioletta Wojnar' },
    { v: '3', chip: 'wt. 15 wrz', ton: 'Neutral',        t: 'Dyktando', s: 'Waga 3, Wioletta Wojnar' },
    { v: '5', chip: 'pt. 11 wrz', ton: 'Neutral',        t: 'Recytacja', s: 'Waga 2, Wioletta Wojnar' },
    { v: '4', chip: 'wt. 8 wrz',  ton: 'Neutral',        t: 'Praca domowa', s: 'Waga 1, Wioletta Wojnar' },
    { v: '3', chip: 'pt. 4 wrz',  ton: 'Neutral',        t: 'Odpowiedź ustna', s: 'Waga 2, Wioletta Wojnar' } ] },
  'Matematyka': { sub: 'Średnia 4,25, 9 ocen', w: [
    { v: '5', chip: 'czw. 17 wrz', ton: 'Neutral', nowe: true, t: 'Sprawdzian, ułamki zwykłe', s: 'Waga 5, Irena Uszyńska',
      cytat: { by: 'Irena Uszyńska:', tekst: 'Zadania z treścią rozwiązane bez jednego błędu. Do poprawy tylko zadanie 4, w którym zgubiła się kreska ułamkowa.' } },
    { v: '+', chip: 'wt. 15 wrz', ton: 'Neutral', t: 'Aktywność na lekcji', s: 'Irena Uszyńska', dolny: 'Nie liczy się do średniej' },
    { v: '4', chip: 'pon. 14 wrz', ton: 'Neutral', t: 'Kartkówka, dodawanie pisemne', s: 'Waga 3, Irena Uszyńska' },
    { v: '5', chip: 'czw. 10 wrz', ton: 'Neutral', t: 'Praca domowa', s: 'Waga 1, Irena Uszyńska' },
    { v: '3', chip: 'wt. 8 wrz',   ton: 'Neutral', t: 'Odpowiedź ustna', s: 'Waga 2, Irena Uszyńska' } ] },
  'Historia': { sub: '2 oceny, Librus nie podaje średniej', w: [
    { v: '5', chip: 'pon. 14 wrz', ton: 'Neutral', t: 'Odpowiedź ustna', s: 'Waga 2, Monika Gos' },
    { v: '4', chip: 'czw. 10 wrz', ton: 'Neutral', t: 'Kartkówka, plemiona słowiańskie', s: 'Waga 3, Monika Gos' } ] }
};
const PO_MATEMATYCE = 'Pokaż pozostałe oceny z matematyki (4)';
const PO_WSZYSTKIM = 'Pokaż przedmioty bez ocen (7)';
const ZDANIE = '16 ocen w tym semestrze, 2 nowe.';
const STOPKA = 'Średnie liczy Librus. Nie liczymy własnych, a gdy Librus średniej nie poda, nie pokazujemy jej wcale.';
const NAZWA = '06a Oceny · oceny cyfrowe';
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemna = sek.name === 'Ciemny motyw';
  const smieci = [];
  try {
    const src = sek.children.find(c => c.name === '05 Zadania · zrobione i archiwum');
    const stary = sek.children.find(c => c.name === NAZWA);
    if (stary) stary.remove();
    const f = src.clone();
    f.name = NAZWA;
    sek.appendChild(f);
    f.x = src.x; f.y = src.y + src.height + 600;
    const main = f.children.find(c => c.name === 'Main Content');
    // wzorce wyjete zanim wyczyscimy Main Content
    const wzorKarta = f.findOne(n => n.type === 'FRAME' && n.name === 'List' && n.fills && n.fills.length).clone();
    const wzorSep = f.findOne(n => n.type === 'RECTANGLE' && n.name === 'Separator').clone();
    const wzorPar = main.children.find(c => c.name === 'Paragraph:margin').clone();
    const wzorSekcja = main.children.find(c => c.name === 'Zadania:margin').clone();
    const wzorDisc = main.children.find(c => c.name === 'Completed:margin').clone();
    for (const w of [wzorKarta, wzorSep, wzorPar, wzorSekcja, wzorDisc]) { figma.currentPage.appendChild(w); smieci.push(w); }
    for (const c of main.children.slice()) c.remove();
    // 1. naglowek
    const ah = f.children.find(c => c.name === 'App header');
    ustaw(ah, { Name: 'Antek', Class: 'klasa 8, SP Raszyn' });
    const av = ah.findOne(n => n.type === 'INSTANCE' && n.name === 'Avatar');
    if (av) ustaw(av, { Initials: 'A' });
    // 2. zdanie zakladki
    const par = wzorPar.clone(); main.appendChild(par); par.layoutSizingHorizontal = 'FILL';
    par.findOne(n => n.type === 'TEXT').characters = ZDANIE;
    par.findOne(n => n.type === 'TEXT').name = ZDANIE;
    // 3. przelacznik semestru
    const segM = figma.createFrame();
    segM.name = 'Semestr:margin'; segM.layoutMode = 'VERTICAL'; segM.itemSpacing = 0;
    segM.paddingTop = 12; segM.paddingRight = 0; segM.paddingBottom = 0; segM.paddingLeft = 0; segM.fills = [];
    main.appendChild(segM); segM.layoutSizingHorizontal = 'FILL';
    const seg = setSeg.children.find(c => c.name === 'Segments=2, Active=1').createInstance();
    segM.appendChild(seg); seg.layoutSizingHorizontal = 'FILL';
    ustaw(seg, { 'Label 1': 'Semestr 1', 'Label 2': 'Semestr 2', 'Show badge': false });
    segM.layoutSizingVertical = 'HUG';
    // pomocnicze: wiersz oceny
    const zrobWiersz = (d) => {
      const r = setListRow.children.find(c => c.name === 'Leading=Icon tile, Trailing=None').createInstance();
      ustaw(r, { Title: d.t, Subtitle: d.s, 'Show subtitle': true, 'Show chips top': true,
                 'Show chip top 2': !!d.nowe, 'Show chips': !!d.dolny, 'Show chip 2': false });
      return r;
    };
    const dopiescWiersz = (r, d) => {
      const lead = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Leading');
      if (lead) { ustaw(lead, { Kind: 'Value', Tone: 'Neutral' }); ustaw(lead, { Value: d.v }); }
      const c1 = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip top 1');
      if (c1) ustaw(c1, { Label: d.chip, Tone: d.ton, Size: 'Default', 'Show icon': true });
      if (d.nowe) { const c2 = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip top 2');
        if (c2) ustaw(c2, { Label: 'Nowe', Tone: 'Info', Size: 'Default', 'Show icon': false }); }
      if (d.dolny) { const cd = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip 1');
        if (cd) ustaw(cd, { Label: d.dolny, Tone: 'Neutral', Size: 'Default', 'Show icon': false }); }
    };
    // 4. sekcje przedmiotow
    const zrobSekcje = (tytul, dane) => {
      const blok = wzorSekcja.clone(); main.appendChild(blok); blok.layoutSizingHorizontal = 'FILL';
      blok.name = 'Oceny:margin';
      const wew = blok.children[0]; wew.name = 'Oceny';
      const sh = wew.findOne(n => n.type === 'INSTANCE' && n.name === 'Section heading');
      ustaw(sh, { Title: tytul, 'Show subtitle': true, Subtitle: dane.sub });
      const karta = wew.findOne(n => n.type === 'FRAME' && n.name === 'List' && n.fills && n.fills.length);
      for (const c of karta.children.slice()) c.remove();
      dane.w.forEach((d, i) => {
        if (i > 0) { const s = wzorSep.clone(); karta.appendChild(s); s.layoutSizingHorizontal = 'FILL'; }
        const r = zrobWiersz(d); karta.appendChild(r); r.layoutSizingHorizontal = 'FILL'; dopiescWiersz(r, d);
        if (d.cytat) {
          const qm = figma.createFrame(); qm.name = 'Quote:margin'; qm.layoutMode = 'VERTICAL'; qm.itemSpacing = 0;
          qm.paddingTop = 12; qm.paddingBottom = 12; qm.paddingLeft = 16; qm.paddingRight = 16; qm.fills = [];
          karta.appendChild(qm); qm.layoutSizingHorizontal = 'FILL';
          const q = kompQuote.createInstance(); qm.appendChild(q); q.layoutSizingHorizontal = 'FILL';
          ustaw(q, { By: d.cytat.by, Text: d.cytat.tekst });
          qm.layoutSizingVertical = 'HUG';
        }
      });
      return blok;
    };
    // 5. rozwijana grupa
    const zrobDisclosure = (etykieta) => {
      const blok = wzorDisc.clone(); main.appendChild(blok); blok.layoutSizingHorizontal = 'FILL';
      blok.name = 'Oceny:margin';
      const wew = blok.children[0]; wew.name = 'Oceny';
      for (const c of wew.children.slice()) if (c.name !== 'Disclosure') c.remove();
      const d = wew.findOne(n => n.type === 'INSTANCE' && n.name === 'Disclosure');
      ustaw(d, { Label: etykieta, Expanded: 'False' });
      return blok;
    };
    zrobSekcje('Język polski', OCENY['Język polski']);
    zrobSekcje('Matematyka', OCENY['Matematyka']);
    zrobDisclosure(PO_MATEMATYCE);
    zrobSekcje('Historia', OCENY['Historia']);
    zrobDisclosure(PO_WSZYSTKIM);
    // 6. stopka
    const stM = figma.createFrame();
    stM.name = 'Foot:margin'; stM.layoutMode = 'VERTICAL'; stM.itemSpacing = 0;
    stM.paddingTop = 24; stM.paddingRight = 0; stM.paddingBottom = 0; stM.paddingLeft = 0; stM.fills = [];
    main.appendChild(stM); stM.layoutSizingHorizontal = 'FILL';
    const st = figma.createText();
    st.characters = STOPKA; st.name = STOPKA;
    await st.setTextStyleIdAsync(S['body/xs'].id);
    st.fills = [paint('color/on-surface-variant')];
    st.textAutoResize = 'HEIGHT';
    stM.appendChild(st); st.layoutSizingHorizontal = 'FILL';
    stM.layoutSizingVertical = 'HUG';
    // 7. pasek zakladek
    const tb = f.children.find(c => c.name === 'Tab bar');
    ustaw(tb, { Active: 'Oceny' });
    const PLAKIETKI = { 'Tab Teraz': '3', 'Tab Wiadomości': '2' };
    for (const ti of tb.children.filter(c => c.type === 'INSTANCE')) {
      const ma = Object.prototype.hasOwnProperty.call(PLAKIETKI, ti.name);
      ustaw(ti, { 'Show badge': ma });
      if (ma) { const bg = ti.findOne(n => n.type === 'INSTANCE' && n.name === 'Badge'); if (bg) ustaw(bg, { Count: PLAKIETKI[ti.name] }); }
    }
    if (ciemna) naCiemny(f);
    for (const w of smieci) w.remove();
    wynik.push({ sekcja: sek.name, wysokosc: Math.round(f.height), blokow: main.children.length });
    await shot(f, { scale: 0.7, name: 't2-06a-' + (ciemna ? 'ciemny' : 'jasny') });
  } catch (e) {
    for (const w of smieci) { try { w.remove(); } catch (x) {} }
    wynik.push({ sekcja: sek.name, blad: String(e && e.message ? e.message : e) });
  }
}
return wynik;
