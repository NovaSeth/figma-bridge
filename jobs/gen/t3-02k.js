//# opis: 02k Frekwencja - rok (klon 02f: chrom zostaje, kalendarz ustepuje liscie miesiecy)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => S[s.name] = s);
const setListRow = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const setSeg = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Segmented control');
const kompSH = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'Section heading' && (!n.parent || n.parent.type !== 'COMPONENT_SET'));
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
// --- rok szkolny 2025/2026: 1108 + 62 + 19 + 7 = 1196 ---
const MIESIACE = [
  { m: 'Wrzesień',   s: '2 nieobecności, 2 spóźnienia',              v: '97%' },
  { m: 'Październik',s: '5 nieobecności, 2 spóźnienia',              v: '95%' },
  { m: 'Listopad',   s: '6 nieobecności, 1 spóźnienie',              v: '94%' },
  { m: 'Grudzień',   s: '6 nieobecności, 2 spóźnienia',              v: '92%' },
  { m: 'Styczeń',    s: '9 nieobecności, 2 spóźnienia, 1 zwolnienie',v: '89%', chip: '3 bez usprawiedliwienia' },
  { m: 'Luty',       s: '7 nieobecności, 1 spóźnienie, 1 zwolnienie',v: '90%' },
  { m: 'Marzec',     s: '8 nieobecności, 3 spóźnienia, 1 zwolnienie',v: '91%', chip: '2 bez usprawiedliwienia' },
  { m: 'Kwiecień',   s: '6 nieobecności, 3 spóźnienia, 1 zwolnienie',v: '92%' },
  { m: 'Maj',        s: '6 nieobecności, 2 spóźnienia, 2 zwolnienia',v: '92%' },
  { m: 'Czerwiec',   s: '7 nieobecności, 1 spóźnienie, 1 zwolnienie',v: '93%', chip: '1 bez usprawiedliwienia' }
];
const STOPKA = 'Tapnij miesiąc, żeby zobaczyć jego kalendarz. Procent liczymy z lekcji, przy których szkoła wpisała frekwencję.';
const NAZWA = '02k Frekwencja · rok';
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemna = sek.name === 'Ciemny motyw';
  const smieci = [];
  try {
    const src = sek.children.find(c => c.name === '02f Teraz · frekwencja');
    const stary = sek.children.find(c => c.name === NAZWA);
    if (stary) stary.remove();
    const f = src.clone();
    f.name = NAZWA;
    sek.appendChild(f);
    f.x = src.x; f.y = src.y + src.height + 1400;
    const main = f.children.find(c => c.name === 'Main Content');
    // wzorzec karty listy bierzemy z istniejacego ekranu, zanim czyscimy
    const src02h = sek.children.find(c => c.name === '02h Frekwencja · szczegóły dnia');
    const wzorKarta = src02h.findOne(n => n.type === 'FRAME' && n.name === 'List' && n.fills && n.fills.length).clone();
    const wzorSep = src02h.findOne(n => n.type === 'RECTANGLE' && n.name === 'Separator').clone();
    figma.currentPage.appendChild(wzorKarta); smieci.push(wzorKarta);
    figma.currentPage.appendChild(wzorSep); smieci.push(wzorSep);
    // 1. przelacznik na Rok
    const seg = main.children.find(c => c.name === 'Segmented control');
    const segNowy = setSeg.children.find(c => c.name === 'Segments=2, Active=2').createInstance();
    main.insertChild(main.children.indexOf(seg), segNowy);
    segNowy.layoutSizingHorizontal = 'FILL';
    ustaw(segNowy, { 'Label 1': 'Miesiąc', 'Label 2': 'Rok', 'Show badge': false });
    seg.remove();
    // 2. okres
    const dateNav = main.findOne(n => n.type === 'INSTANCE' && n.name === 'Date nav');
    ustaw(dateNav, { Period: 'Rok szkolny 2025/2026' });
    // 3. KPI
    const kpi = main.children.find(c => c.name === 'KPI card');
    ustaw(kpi, { Value: '93%', Title: 'Obecność na 1108 z 1196 lekcji',
      Detail: '62 nieobecności, 19 spóźnień, 7 zwolnień', 'Show chip': true });
    const chipKpi = kpi.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip');
    if (chipKpi) ustaw(chipKpi, { Label: '6 bez usprawiedliwienia', Tone: 'Error', Size: 'Default', 'Show icon': false });
    // 4. kalendarz i legenda ustepuja miejsca
    for (const nz of ['Kalendarz', 'Legenda', 'Wypełniacz']) {
      const n = main.children.find(c => c.name === nz);
      if (n) n.remove();
    }
    const foot = main.children.find(c => c.name === 'Foot');
    // 5. naglowek sekcji
    const shWrap = figma.createFrame();
    shWrap.name = 'Miesiące:margin';
    shWrap.layoutMode = 'VERTICAL'; shWrap.itemSpacing = 8;
    shWrap.paddingTop = 8; shWrap.paddingRight = 0; shWrap.paddingBottom = 0; shWrap.paddingLeft = 0;
    shWrap.fills = [];
    main.insertChild(main.children.indexOf(foot), shWrap);
    shWrap.layoutSizingHorizontal = 'FILL';
    const sh = kompSH.createInstance();
    shWrap.appendChild(sh);
    sh.layoutSizingHorizontal = 'FILL';
    ustaw(sh, { Title: 'Miesiąc po miesiącu', 'Show subtitle': false });
    // 6. karta z lista miesiecy - to lista na ekranie, wiec bez obrysu
    const karta = wzorKarta.clone();
    shWrap.appendChild(karta);
    karta.layoutSizingHorizontal = 'FILL';
    karta.strokes = [];
    for (const c of karta.children.slice()) c.remove();
    MIESIACE.forEach((d, i) => {
      if (i > 0) { const s = wzorSep.clone(); karta.appendChild(s); s.layoutSizingHorizontal = 'FILL'; }
      const r = setListRow.children.find(c => c.name === 'Leading=None, Trailing=Value').createInstance();
      r.name = d.m;
      karta.appendChild(r);
      r.layoutSizingHorizontal = 'FILL';
      ustaw(r, { Title: d.m, 'Show subtitle': true, Subtitle: d.s, Value: d.v,
                 'Show chips top': false, 'Show chip top 2': false, 'Show chips': !!d.chip, 'Show chip 2': false });
      if (d.chip) { const c1 = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip 1');
        if (c1) ustaw(c1, { Label: d.chip, Tone: 'Error', Size: 'Default', 'Show icon': false }); }
    });
    shWrap.layoutSizingVertical = 'HUG';
    // 7. stopka
    const tekst = foot.findOne(n => n.type === 'TEXT');
    tekst.characters = STOPKA;
    tekst.name = STOPKA.slice(0, 60);
    // 8. ekran dlugi: ramka rosnie z trescia
    main.layoutSizingVertical = 'HUG';
    f.layoutSizingVertical = 'HUG';
    if (ciemna) naCiemny(f);
    for (const w of smieci) w.remove();
    wynik.push({ sekcja: sek.name, wysokosc: Math.round(f.height), kpi: Math.round(kpi.height),
      karta: Math.round(karta.height), wiersze: karta.children.filter(c => c.type === 'INSTANCE').map(c => Math.round(c.height)).join(','),
      dzieci: main.children.map(c => c.name + ':' + Math.round(c.height)).join(' | ') });
    await shot(f, { scale: 0.7, name: 't3-02k-' + (ciemna ? 'ciemny' : 'jasny') });
  } catch (e) {
    for (const w of smieci) { try { w.remove(); } catch (x) {} }
    wynik.push({ sekcja: sek.name, blad: String(e && e.message ? e.message : e), stos: String(e && e.stack || '').slice(0, 400) });
  }
}
return wynik;
