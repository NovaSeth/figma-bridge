//# opis: 02j Frekwencja - szczegoly dnia z nieobecnoscia (klon 02h + tlo z 02i), oba motywy
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => S[s.name] = s);
const setListRow = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const setRing = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Day ring');
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
const TAU = Math.PI * 2, START = -Math.PI / 2;
// --- 17 wrzesnia u Antka: 5 obecnosci, 1 spoznienie, 2 nieobecnosci (w tym 1 bez usprawiedliwienia) ---
const LEKCJE = [
  { nr: '1', t: 'Matematyka',          status: 'Obecność',    ton: 'Success' },
  { nr: '2', t: 'Język polski',        status: 'Spóźnienie',  ton: 'Warning' },
  { nr: '3', t: 'Język polski',        status: 'Obecność',    ton: 'Success' },
  { nr: '4', t: 'Chemia',              status: 'Nieobecność', ton: 'Error', uzup: 'Usprawiedliwiona' },
  { nr: '5', t: 'Fizyka',              status: 'Obecność',    ton: 'Success' },
  { nr: '6', t: 'Wychowanie fizyczne', status: 'Nieobecność', ton: 'Error', uzup: 'Bez usprawiedliwienia' },
  { nr: '7', t: 'Język angielski',     status: 'Obecność',    ton: 'Success' },
  { nr: '8', t: 'Historia',            status: 'Obecność',    ton: 'Success' }
];
const NAGL = { tytul: 'Czwartek, 17 września', pod: 'Obecność na 5 z 8 lekcji', detal: '1 spóźnienie, 2 nieobecności, w tym 1 bez usprawiedliwienia' };
const NAZWA = '02j Frekwencja · szczegóły dnia z nieobecnością';
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemna = sek.name === 'Ciemny motyw';
  try {
    const src = sek.children.find(c => c.name === '02h Frekwencja · szczegóły dnia');
    const src02i = sek.children.find(c => c.name === '02i Frekwencja · z nieobecnościami');
    const stary = sek.children.find(c => c.name === NAZWA);
    if (stary) stary.remove();
    const f = src.clone();
    f.name = NAZWA;
    sek.appendChild(f);
    f.x = src.x; f.y = src.y + src.height + 700;
    f.clipsContent = true;
    // --- 1. tlo: Main Content z 02i (ten sam miesiac z nieobecnosciami) ---
    const stareMain = f.children.find(c => c.name === 'Main Content');
    const noweMain = src02i.children.find(c => c.name === 'Main Content').clone();
    f.insertChild(0, noweMain);
    stareMain.remove();
    noweMain.layoutSizingHorizontal = 'FILL';
    noweMain.layoutSizingVertical = 'FILL';
    // --- 2. arkusz ---
    const sheet = f.children.find(c => c.name === 'Bottom sheet');
    const body = sheet.findOne(n => n.name === 'Body');
    const pod = body.children.find(c => c.name === 'Podsumowanie dnia');
    // 2a. pierscien: instancja Day ring zamiast recznego kola 64 px
    const stareKolo = pod.children.find(c => c.name === 'Pierścień');
    const ring = setRing.children.find(c => c.name === 'State=Partial, Tone=Error').createInstance();
    ring.name = 'Day ring';
    pod.insertChild(0, ring);
    ustaw(ring, { Day: '17' });
    const arc = ring.findOne(n => n.name === 'Arc');
    arc.arcData = { startingAngle: START, endingAngle: START + TAU * 0.625, innerRadius: 0.72 };
    if (stareKolo) stareKolo.remove();
    // 2b. opis: tytul, podtytul, trzeci wiersz tylko dla dnia mieszanego
    const opis = pod.children.find(c => c.name === 'Opis');
    const teksty = opis.children.filter(c => c.type === 'TEXT');
    teksty[0].characters = NAGL.tytul; teksty[0].name = NAGL.tytul;
    teksty[1].characters = NAGL.pod;   teksty[1].name = NAGL.pod;
    let detal = opis.children.find(c => c.name === 'Detal');
    if (!detal) {
      detal = teksty[1].clone();
      opis.appendChild(detal);
      await detal.setTextStyleIdAsync(S['body/sm'].id);
      detal.layoutSizingHorizontal = 'FILL';
      detal.textAutoResize = 'HEIGHT';
    }
    detal.name = 'Detal';
    detal.characters = NAGL.detal;
    // 2c. lista lekcji: instancje List row zamiast recznie skladanych wierszy
    const lista = body.children.find(c => c.name === 'List');
    const wzorSep = lista.findOne(n => n.type === 'RECTANGLE' && n.name === 'Separator').clone();
    figma.currentPage.appendChild(wzorSep);
    for (const c of lista.children.slice()) c.remove();
    LEKCJE.forEach((d, i) => {
      if (i > 0) { const s = wzorSep.clone(); lista.appendChild(s); s.layoutSizingHorizontal = 'FILL'; }
      const r = setListRow.children.find(c => c.name === 'Leading=Icon tile, Trailing=Chip').createInstance();
      r.name = 'Lekcja ' + d.nr;
      lista.appendChild(r);
      r.layoutSizingHorizontal = 'FILL';
      // stan po prawej, usprawiedliwienie slowem w podtytule - nigdy drugim odcieniem czerwieni
      ustaw(r, { Title: d.t, 'Show subtitle': !!d.uzup, Subtitle: d.uzup || '',
                 'Show chips top': false, 'Show chip top 2': false, 'Show chips': false, 'Show chip 2': false });
      const lead = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Leading');
      if (lead) { ustaw(lead, { Kind: 'Value', Tone: 'Neutral' }); ustaw(lead, { Value: d.nr }); }
      const st = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip');
      if (st) ustaw(st, { Label: d.status, Tone: d.ton, Size: 'Default', 'Show icon': false });
    });
    wzorSep.remove();
    // --- 3. arkusz przy dole, przyciemnienie na caly kadr ---
    sheet.layoutSizingVertical = 'HUG';
    sheet.y = 874 - sheet.height;
    sheet.x = 0;
    const scrim = f.children.find(c => c.name === 'Scrim');
    if (scrim) { scrim.x = 0; scrim.y = 0; scrim.resize(402, 874); }
    if (ciemna) naCiemny(f);
    wynik.push({ sekcja: sek.name, wysokosc: Math.round(f.height), arkusz: Math.round(sheet.height),
      arkuszY: Math.round(sheet.y), udzialArkusza: (sheet.height / 874 * 100).toFixed(0) + '%',
      wiersze: lista.children.filter(c => c.type === 'INSTANCE').map(c => Math.round(c.height)).join(',') });
    await shot(f, { scale: 0.7, name: 't3-02j-' + (ciemna ? 'ciemny' : 'jasny') });
  } catch (e) {
    wynik.push({ sekcja: sek.name, blad: String(e && e.message ? e.message : e), stos: String(e && e.stack || '').slice(0, 400) });
  }
}
return wynik;
