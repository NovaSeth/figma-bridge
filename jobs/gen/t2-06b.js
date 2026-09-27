//# opis: 06b Oceny - oceny opisowe (klon 06a, Message card zamiast kart z wierszami), oba motywy
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => S[s.name] = s);
const setMsg = ds.findOne(x => x.type === 'COMPONENT_SET' && x.name === 'Message card');
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color'), cDark = kol.find(c => c.name === 'Color Dark');
const nazwaJasnej = {}, ciemnaPoNazwie = {};
for (const v of vars) { if (v.variableCollectionId === cLight.id) nazwaJasnej[v.id] = v.name; if (v.variableCollectionId === cDark.id) ciemnaPoNazwie[v.name] = v; }
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
const OPISOWE = [
  { przedmiot: 'Edukacja polonistyczna', meta: 'wychowawczyni, czw. 17 wrz',
    tekst: 'Julia czyta płynnie proste zdania i coraz pewniej dzieli wyrazy na sylaby. W zeszycie pisze starannie, litery mieści w liniaturze. Warto w domu poćwiczyć głoskowanie wyrazów z dwuznakami, bo tu jeszcze się gubi.' },
  { przedmiot: 'Edukacja matematyczna', meta: 'wychowawczyni, pt. 11 wrz',
    tekst: 'Julia dodaje i odejmuje w zakresie 10 bez liczenia na palcach. Zadania z treścią rozwiązuje samodzielnie, gdy przeczyta je na głos. Przy zapisie cyfr myli jeszcze 6 i 9.' },
  { przedmiot: 'Edukacja artystyczna', meta: 'wychowawczyni, wt. 8 wrz',
    tekst: 'Julia chętnie śpiewa i zapamiętuje słowa piosenek po dwóch powtórzeniach. Prace plastyczne kończy w czasie lekcji i sprząta po sobie miejsce.' }
];
const NAUCZYCIELKA = 'Joanna Osęka-Więcławicz';
const ZDANIE = '3 oceny opisowe w tym semestrze, najnowsza z 17 września.';
const STOPKA = 'Ocena opisowa to cała wypowiedź nauczyciela. Pokazujemy ją bez skrótów, dokładnie tak, jak trafiła do Librusa.';
const NAZWA = '06b Oceny · oceny opisowe';
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemna = sek.name === 'Ciemny motyw';
  const smieci = [];
  try {
    const src = sek.children.find(c => c.name === '06a Oceny · oceny cyfrowe');
    if (!src) throw new Error('brak 06a');
    const stary = sek.children.find(c => c.name === NAZWA);
    if (stary) stary.remove();
    const f = src.clone();
    f.name = NAZWA;
    sek.appendChild(f);
    f.x = src.x; f.y = src.y + src.height + 600;
    const main = f.children.find(c => c.name === 'Main Content');
    // wzorzec bloku sekcji: naglowek + miejsce na tresc
    const wzorSekcja = main.children[2].clone();          // Oceny:margin (Jezyk polski)
    figma.currentPage.appendChild(wzorSekcja); smieci.push(wzorSekcja);
    const par = main.children[0], segM = main.children[1], stM = main.children[main.children.length - 1];
    for (const c of main.children.slice()) if (c !== par && c !== segM && c !== stM) c.remove();
    // naglowek: z powrotem Julia
    const ah = f.children.find(c => c.name === 'App header');
    ustaw(ah, { Name: 'Julia', Class: 'klasa 1, SP Łady' });
    const av = ah.findOne(n => n.type === 'INSTANCE' && n.name === 'Avatar');
    if (av) ustaw(av, { Initials: 'J' });
    // zdanie zakladki
    const tPar = par.findOne(n => n.type === 'TEXT');
    tPar.characters = ZDANIE; tPar.name = ZDANIE;
    // sekcje z Message card, wstawione przed stopka
    const idxStopki = main.children.indexOf(stM);
    let gdzie = idxStopki;
    for (const d of OPISOWE) {
      const blok = wzorSekcja.clone();
      main.insertChild(gdzie, blok); gdzie++;
      blok.layoutSizingHorizontal = 'FILL';
      blok.name = 'Oceny:margin';
      const wew = blok.children[0]; wew.name = 'Oceny';
      const sh = wew.findOne(n => n.type === 'INSTANCE' && n.name === 'Section heading');
      ustaw(sh, { Title: d.przedmiot, 'Show subtitle': true, Subtitle: 'Ocena bieżąca' });
      for (const c of wew.children.slice()) if (c !== sh) c.remove();
      const mcard = setMsg.children.find(c => c.name === 'Own=False').createInstance();
      wew.appendChild(mcard); mcard.layoutSizingHorizontal = 'FILL';
      ustaw(mcard, { Name: NAUCZYCIELKA, Meta: d.meta, Body: d.tekst });
      const a2 = mcard.findOne(n => n.type === 'INSTANCE' && n.name === 'Avatar');
      if (a2) ustaw(a2, { Initials: 'JO' });
    }
    // stopka
    const tSt = stM.findOne(n => n.type === 'TEXT');
    tSt.characters = STOPKA; tSt.name = STOPKA;
    // pasek zakladek: Julia ma 7 spraw
    const tb = f.children.find(c => c.name === 'Tab bar');
    const PLAKIETKI = { 'Tab Teraz': '7', 'Tab Wiadomości': '2' };
    for (const ti of tb.children.filter(c => c.type === 'INSTANCE')) {
      const ma = Object.prototype.hasOwnProperty.call(PLAKIETKI, ti.name);
      ustaw(ti, { 'Show badge': ma });
      if (ma) { const bg = ti.findOne(n => n.type === 'INSTANCE' && n.name === 'Badge'); if (bg) ustaw(bg, { Count: PLAKIETKI[ti.name] }); }
    }
    if (ciemna) naCiemny(f);
    for (const w of smieci) w.remove();
    wynik.push({ sekcja: sek.name, wysokosc: Math.round(f.height), bloki: main.children.map(c => c.name) });
    await shot(f, { scale: 0.85, name: 't2-06b-' + (ciemna ? 'ciemny' : 'jasny') });
  } catch (e) {
    for (const w of smieci) { try { w.remove(); } catch (x) {} }
    wynik.push({ sekcja: sek.name, blad: String(e && e.message ? e.message : e) });
  }
}
return wynik;
