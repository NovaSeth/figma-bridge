//# opis: 02h - ostatni reczny pierscien i recznie skladane wiersze na komponenty
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const setListRow = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const setRing = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Day ring');
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
const LEKCJE = [
  { nr: '1', t: 'Język angielski' }, { nr: '2', t: 'Edukacja wczesnoszkolna' },
  { nr: '3', t: 'Edukacja wczesnoszkolna' }, { nr: '4', t: 'Religia' }
];
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemna = sek.name === 'Ciemny motyw';
  try {
    const f = sek.children.find(c => c.name === '02h Frekwencja · szczegóły dnia');
    const sheet = f.children.find(c => c.name === 'Bottom sheet');
    const body = sheet.findOne(n => n.name === 'Body');
    const pod = body.children.find(c => c.name === 'Podsumowanie dnia');
    const zrobione = [];
    // 1. pierscien
    const stareKolo = pod.children.find(c => c.name === 'Pierścień');
    if (stareKolo) {
      const ring = setRing.children.find(c => c.name === 'State=Full, Tone=Neutral').createInstance();
      ring.name = 'Day ring';
      pod.insertChild(0, ring);
      ustaw(ring, { Day: '17' });
      stareKolo.remove();
      zrobione.push('pierścień → instancja Day ring');
    }
    // 2. wiersze
    const lista = body.children.find(c => c.name === 'List');
    if (lista.children.some(c => c.type === 'FRAME' && /^Lekcja/.test(c.name))) {
      const wzorSep = lista.findOne(n => n.type === 'RECTANGLE' && n.name === 'Separator').clone();
      figma.currentPage.appendChild(wzorSep);
      for (const c of lista.children.slice()) c.remove();
      LEKCJE.forEach((d, i) => {
        if (i > 0) { const s = wzorSep.clone(); lista.appendChild(s); s.layoutSizingHorizontal = 'FILL'; }
        const r = setListRow.children.find(c => c.name === 'Leading=Icon tile, Trailing=Chip').createInstance();
        r.name = 'Lekcja ' + d.nr;
        lista.appendChild(r);
        r.layoutSizingHorizontal = 'FILL';
        ustaw(r, { Title: d.t, 'Show subtitle': false, 'Show chips top': false, 'Show chip top 2': false, 'Show chips': false, 'Show chip 2': false });
        const lead = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Leading');
        if (lead) { ustaw(lead, { Kind: 'Value', Tone: 'Neutral' }); ustaw(lead, { Value: d.nr }); }
        const st = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip');
        if (st) ustaw(st, { Label: 'Obecność', Tone: 'Success', Size: 'Default', 'Show icon': false });
      });
      wzorSep.remove();
      zrobione.push('4 wiersze → instancje List row');
    }
    sheet.layoutSizingVertical = 'HUG';
    sheet.y = 874 - sheet.height;
    sheet.x = 0;
    if (ciemna) naCiemny(f);
    const reczne = f.findAll(n => (n.type === 'ELLIPSE' || n.type === 'VECTOR') && !n.removed &&
      !(n.parent && (n.parent.type === 'INSTANCE' || n.parent.type === 'COMPONENT'))).map(n => n.name);
    wynik.push({ sekcja: sek.name, wysokosc: Math.round(f.height), arkusz: Math.round(sheet.height),
      arkuszY: Math.round(sheet.y), zrobione, recznaGeometria: reczne });
    await shot(f, { scale: 0.7, name: 't3-02h-' + (ciemna ? 'ciemny' : 'jasny') });
  } catch (e) {
    wynik.push({ sekcja: sek.name, blad: String(e && e.message ? e.message : e), stos: String(e && e.stack || '').slice(0, 400) });
  }
}
return wynik;
