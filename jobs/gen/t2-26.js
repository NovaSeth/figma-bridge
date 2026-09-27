//# opis: 26 Stan - zasob niedostepny (klon 15, baner Info pod karta dnia), oba motywy
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const setBanner = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Banner');
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color'), cDark = kol.find(c => c.name === 'Color Dark');
const nazwaJasnej = {}, ciemnaPoNazwie = {};
for (const v of vars) { if (v.variableCollectionId === cLight.id) nazwaJasnej[v.id] = v.name; if (v.variableCollectionId === cDark.id) ciemnaPoNazwie[v.name] = v; }
const naCiemny = (root) => {
  const przepnij = lista => { let z = false; const n = lista.map(p => { const b = p.boundVariables && p.boundVariables.color; if (!b) return p; const nm = nazwaJasnej[b.id]; if (!nm || !ciemnaPoNazwie[nm]) return p; z = true; return figma.variables.setBoundVariableForPaint(p, 'color', ciemnaPoNazwie[nm]); }); return z ? n : null; };
  for (const n of root.findAll(() => true).concat([root])) {
    if ('fills' in n && n.fills && n.fills !== figma.mixed && n.fills.length) { const x = przepnij(n.fills); if (x) try { n.fills = x; } catch (e) {} }
    if ('strokes' in n && n.strokes && n.strokes.length) { const x = przepnij(n.strokes); if (x) try { n.strokes = x; } catch (e) {} }
  }
};
const TEKST = 'SP Łady nie udostępnia rodzicom zastępstw w Librusie. Jeśli lekcję poprowadzi ktoś inny, nie zobaczysz tego w planie.';
const NAZWA = '26 Stan · zasób niedostępny';
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemna = sek.name === 'Ciemny motyw';
  try {
    const src = sek.children.find(c => c.name === '15 Plan · dzień');
    if (!src) { wynik.push({ sekcja: sek.name, blad: 'brak 15' }); continue; }
    const stary = sek.children.find(c => c.name === NAZWA);
    if (stary) stary.remove();
    const f = src.clone();
    f.name = NAZWA;
    sek.appendChild(f);
    f.x = src.x; f.y = src.y + src.height + 600;   // tymczasowo, ukladaj.js ustawi docelowo
    const main = f.children.find(c => c.name === 'Main Content');
    const idx = main.children.findIndex(c => c.name === 'TimeGrid:margin');
    if (idx < 0) throw new Error('brak TimeGrid:margin');
    const wrap = figma.createFrame();
    wrap.name = 'Alert:margin';
    wrap.layoutMode = 'VERTICAL';
    wrap.itemSpacing = 0;
    wrap.paddingTop = 16; wrap.paddingRight = 0; wrap.paddingBottom = 0; wrap.paddingLeft = 0;
    wrap.fills = [];
    main.insertChild(idx + 1, wrap);
    wrap.layoutSizingHorizontal = 'FILL';
    const b = setBanner.children.find(c => c.name === 'Tone=Info').createInstance();
    wrap.appendChild(b);
    b.layoutSizingHorizontal = 'FILL';
    const p = b.componentProperties || {};
    const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
    b.setProperties({ [k('Text')]: TEKST, [k('Show action')]: false });
    wrap.layoutSizingVertical = 'HUG';
    if (ciemna) naCiemny(wrap);
    // nazwy warstw: wyczysc pozostalosci po "planie przykladowym"
    for (const t of f.findAll(n => n.type === 'TEXT' && /przykładow/i.test(n.name))) t.name = t.characters.slice(0, 60);
    // FAB: 16 px nad paskiem zakladek (zmierzone na 15 i 07)
    const tb = f.children.find(c => c.name === 'Tab bar');
    const fab = f.children.find(c => c.name === 'FAB');
    if (tb && fab) fab.y = tb.y - 16 - fab.height;
    wynik.push({ sekcja: sek.name, wysokosc: Math.round(f.height), banerH: Math.round(b.height), fabDoTab: tb && fab ? Math.round(tb.y - (fab.y + fab.height)) : null });
    await shot(f, { scale: 0.75, name: 't2-26-' + (ciemna ? 'ciemny' : 'jasny') });
  } catch (e) { wynik.push({ sekcja: sek.name, blad: String(e && e.message ? e.message : e) }); }
}
return wynik;
