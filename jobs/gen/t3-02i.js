//# opis: 02i Frekwencja - z nieobecnosciami (klon 02f), oba motywy
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => S[s.name] = s);
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
const wartosc = (inst, nz) => { const p = inst.componentProperties || {}; const k = Object.keys(p).find(y => y.split('#')[0] === nz); return k ? p[k].value : null; };
const TAU = Math.PI * 2, START = -Math.PI / 2;
const ustawLuk = (inst, udzial) => {
  const arc = inst.findOne(n => n.name === 'Arc');
  if (!arc) return 'brak Arc';
  arc.arcData = { startingAngle: START, endingAngle: START + TAU * udzial, innerRadius: 0.72 };
  return 'arc ' + udzial.toFixed(3);
};
// --- dane wrzesnia 2026 dla Antka (85 = 69 obecnosci + 3 spoznienia + 1 zwolnienie + 12 nieobecnosci) ---
const DNI = {
  1:  { st: 'None' },
  2:  { st: 'Full' }, 3: { st: 'Full' },
  4:  { st: 'Partial', ton: 'Warning', arc: 6 / 7 },
  7:  { st: 'Full' },
  8:  { st: 'Partial', ton: 'Warning', arc: 7 / 8 },
  9:  { st: 'Partial', ton: 'Error', arc: 0 },
  10: { st: 'Full' },
  11: { st: 'Partial', ton: 'Error', arc: 5 / 6 },
  14: { st: 'Full' },
  15: { st: 'Partial', ton: 'Error', arc: 6 / 8 },
  16: { st: 'Partial', ton: 'Neutral', arc: 6 / 7 },
  17: { st: 'Partial', ton: 'Error', arc: 5 / 8 },
  18: { st: 'Today' },
  21: { st: 'None' }, 22: { st: 'None' }, 23: { st: 'None' }, 24: { st: 'None' }, 25: { st: 'None' },
  28: { st: 'None' }, 29: { st: 'None' }, 30: { st: 'None' },
  5: { st: 'Empty' }, 6: { st: 'Empty' }, 12: { st: 'Empty' }, 13: { st: 'Empty' },
  19: { st: 'Empty' }, 20: { st: 'Empty' }, 26: { st: 'Empty' }, 27: { st: 'Empty' }
};
const LEGENDA = [
  { l: 'Obecność', t: 'Success' }, { l: 'Spóźnienie', t: 'Warning' },
  { l: 'Nieobecność', t: 'Error' }, { l: 'Zwolnienie', t: 'Neutral' }
];
const STOPKA = 'Zielony łuk to lekcje z obecnością, kolor reszty mówi, czego zabrakło; cały szary pierścień znaczy, że szkoła nic nie wpisała. Tapnij dzień, żeby zobaczyć lekcje.';
const NAZWA = '02i Frekwencja · z nieobecnościami';
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemna = sek.name === 'Ciemny motyw';
  try {
    const src = sek.children.find(c => c.name === '02f Teraz · frekwencja');
    const stary = sek.children.find(c => c.name === NAZWA);
    if (stary) stary.remove();
    const f = src.clone();
    f.name = NAZWA;
    sek.appendChild(f);
    f.x = src.x; f.y = src.y + src.height + 700;
    const main = f.children.find(c => c.name === 'Main Content');
    // 1. KPI
    const kpi = main.children.find(c => c.name === 'KPI card');
    ustaw(kpi, { Value: '81%', Title: 'Obecność na 69 z 85 lekcji',
      Detail: '12 nieobecności, 3 spóźnienia, 1 zwolnienie', 'Show chip': true });
    const chipKpi = kpi.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip');
    if (chipKpi) ustaw(chipKpi, { Label: '3 bez usprawiedliwienia', Tone: 'Error', Size: 'Default', 'Show icon': false });
    // 2. kalendarz
    const kal = main.children.find(c => c.name === 'Kalendarz');
    const raport = [];
    for (const tydz of kal.children.filter(c => c.name === 'Tydzień')) {
      for (const kom of tydz.children) {
        const ring = kom.children.find(c => c.type === 'INSTANCE' && c.name === 'Day ring');
        if (!ring || ring.visible === false) continue;
        const d = parseInt(wartosc(ring, 'Day'), 10);
        const plan = DNI[d];
        if (!plan) { raport.push('BRAK planu dla ' + d); continue; }
        ustaw(ring, { State: plan.st, Tone: plan.ton || 'Neutral' });
        if (plan.st === 'Partial') raport.push(d + ':' + plan.st + '/' + (plan.ton || 'Neutral') + ' ' + ustawLuk(ring, plan.arc));
        else raport.push(d + ':' + plan.st);
      }
    }
    // 3. legenda: cztery chipy, drugi wiersz przez zawijanie
    const leg = main.children.find(c => c.name === 'Legenda');
    const chipy = leg.children.filter(c => c.type === 'INSTANCE');
    while (leg.children.filter(c => c.type === 'INSTANCE').length < 4) {
      const kl = chipy[0].clone();
      leg.appendChild(kl);
    }
    leg.layoutWrap = 'WRAP';
    leg.counterAxisSpacing = 8;
    leg.paddingBottom = 12;   // drugi wiersz chipow nie potrzebuje 16 px pod spodem
    leg.children.filter(c => c.type === 'INSTANCE').forEach((c, i) => {
      if (!LEGENDA[i]) return;
      ustaw(c, { Label: LEGENDA[i].l, Tone: LEGENDA[i].t, Size: 'Default', 'Show icon': false });
    });
    // 4. stopka
    const foot = main.children.find(c => c.name === 'Foot');
    const tekst = foot.findOne(n => n.type === 'TEXT');
    tekst.characters = STOPKA;
    tekst.name = STOPKA.slice(0, 60);
    if (ciemna) naCiemny(f);
    const ost = main.children[main.children.length - 1];
    wynik.push({ sekcja: sek.name, wysokosc: Math.round(f.height),
      kpi: Math.round(kpi.height), detail: Math.round(kpi.findOne(n => n.name === 'Detail').height), legenda: Math.round(leg.height), stopka: Math.round(foot.height),
      dolTresci: Math.round(ost.y + ost.height), zapas: Math.round(874 - (ost.y + ost.height)),
      dni: raport.length, raport: raport.join(' ') });
    await shot(f, { scale: 0.7, name: 't3-02i-' + (ciemna ? 'ciemny' : 'jasny') });
  } catch (e) {
    wynik.push({ sekcja: sek.name, blad: String(e && e.message ? e.message : e), stos: String(e && e.stack || '').slice(0, 300) });
  }
}
return wynik;
