//# opis: tor pierscienia Neutral na color/outline, Antek do SP Lady, nota przy 02k
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => S[s.name] = s);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color'), cDark = kol.find(c => c.name === 'Color Dark');
const zm = (n, k) => vars.find(v => v.name === n && v.variableCollectionId === k.id);
const paint = (n, k) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', zm(n, k));
const ustaw = (inst, mapa) => {
  const p = inst.componentProperties || {}; const out = {};
  for (const [nz, w] of Object.entries(mapa)) { const k = Object.keys(p).find(y => y.split('#')[0] === nz); if (k) out[k] = w; }
  if (Object.keys(out).length) inst.setProperties(out);
};
const log = { krok: [] };

// ---- 1. tor pierscienia: Neutral przy Partial niesie zwolnienie, wiec nie moze byc dekoracja ----
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Day ring');
const partNeutral = set.children.find(c => c.name === 'State=Partial, Tone=Neutral');
partNeutral.children.find(c => c.name === 'Track').fills = [paint('color/outline', cLight)];
log.krok.push('wariant State=Partial, Tone=Neutral: tor → color/outline');
for (const c of set.children) {
  const tor = c.children.find(x => x.name === 'Track');
  if (!tor) continue;
  const b = tor.fills[0].boundVariables.color;
  log.krok.push('  ' + c.name + ' → ' + vars.find(v => v.id === b.id).name);
}
const OPIS_RING = 'Dzień w kalendarzu frekwencji, 44 px. Długość zielonego łuku to udział lekcji, na których dziecko było BEZ żadnej adnotacji — to inna wielkość niż procent obecności na karcie KPI, bo Librus liczy spóźnienie i zwolnienie jako obecność, a łuk ich nie rysuje. Łuk ustawia się jako override podwarstwy „Arc" na konkretnej instancji (Full = komplet, Partial = ułamek, łuk zerowy = nie było na żadnej lekcji), nigdy nowym wariantem; dlatego nie ma osi „Share" ani stanu „Zero". Ton maluje tę część pierścienia, która obecnością nie jest, i niesie NAJPOWAŻNIEJSZY status dnia, nie dominujący: Error = nieobecność, Warning = spóźnienie, Neutral = zwolnienie. Długość odpowiada więc na „ile", a kolor na „jak źle" — dzień z sześcioma obecnościami i dwiema nieobecnościami nie udaje zielonego, a jedno spóźnienie nie wygląda jak całodniowa nieobecność. Ton ma sens tylko przy Partial: przy Full łuk zakrywa cały pierścień, a Today, None i Empty nie pokazują obecności — zestaw jest z tego powodu celowo niepełny. Kolory toru: Neutral przy Partial chodzi po color/outline (3,68:1), bo szary wycinek jest tam JEDYNYM nośnikiem informacji o zwolnieniu; pozostałe stany trzymają recesywny color/outline-variant, bo pełny szary pierścień znaczy „szkoła nic nie wpisała" i odróżnia go od weekendu także kolor cyfry — brak informacji ma się cofać. Dzień ze zwolnieniem ma zawsze łuk krótszy od pełnego, żeby te dwa szare dni dało się odróżnić. Today przykrywa dane dnia bieżącego — widać je po tapnięciu, w arkuszu.';
set.description = OPIS_RING;
for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
  const board = sek.children.find(c => c.name === 'Board');
  if (!board) continue;
  const doc = board.children.find(c => c.name === 'Doc · Day ring');
  if (!doc) continue;
  const t = doc.children.filter(c => c.type === 'TEXT');
  if (t.length >= 2) { t[1].characters = OPIS_RING; t[1].name = OPIS_RING.slice(0, 60); log.krok.push('Doc · Day ring zaktualizowany'); }
  break;
}
// instancje w ciemnym motywie maja nadpisany tor (naCiemny), wiec musza dostac jawnie ciemny odpowiednik
await figma.setCurrentPageAsync(page);
log.instancje = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const kolekcja = sek.name === 'Ciemny motyw' ? cDark : cLight;
  for (const f of sek.children.filter(c => c.type === 'FRAME')) {
    for (const r of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Day ring')) {
      if (r.visible === false) continue;
      const p = r.componentProperties || {};
      const st = Object.keys(p).find(k => k.split('#')[0] === 'State');
      const tn = Object.keys(p).find(k => k.split('#')[0] === 'Tone');
      const dz = Object.keys(p).find(k => k.split('#')[0] === 'Day');
      if (!st || p[st].value !== 'Partial' || !tn || p[tn].value !== 'Neutral') continue;
      const tor = r.findOne(n => n.name === 'Track');
      if (tor) tor.fills = [paint('color/outline', kolekcja)];
      log.instancje.push(sek.name + ' / ' + f.name + ' / dzień ' + p[dz].value);
    }
  }
}

// ---- 2. Antek zostaje w SP Lady: 403 na zastepstwach to uprawnienie konta, nie cecha szkoly ----
log.szkola = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const f = sek.children.find(c => c.name === '06a Oceny · oceny cyfrowe');
  if (!f) continue;
  const ah = f.children.find(c => c.name === 'App header') || f.findOne(n => n.type === 'INSTANCE' && n.name === 'App header');
  ustaw(ah, { Class: 'klasa 8, SP Łady' });
  const p = ah.componentProperties;
  log.szkola.push(sek.name + ': ' + p[Object.keys(p).find(k => k.split('#')[0] === 'Class')].value);
}

// ---- 3. nota przy 02k: ktory to wrzesien ----
const NOTA = 'Doc · 02k Frekwencja · rok';
const TRESC = 'Ten ekran pokazuje poprzedni rok szkolny 2025/2026: bieżący ma na 18 września dwa tygodnie danych i nie da się na nim ocenić listy miesięcy. „Wrzesień" w tej liście to wrzesień 2025, a nie ten sam wrzesień, który pokazuje 02i.';
log.nota = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const kolekcja = sek.name === 'Ciemny motyw' ? cDark : cLight;
  const f02k = sek.children.find(c => c.name === '02k Frekwencja · rok');
  let t = sek.children.find(c => c.type === 'TEXT' && c.name === NOTA);
  if (!t) { t = figma.createText(); t.name = NOTA; sek.appendChild(t); log.nota.push(sek.name + ': utworzona'); }
  await t.setTextStyleIdAsync(S['body/xs'].id);
  t.characters = TRESC;
  t.textAutoResize = 'HEIGHT';
  t.resize(402, t.height);
  t.fills = [paint('color/on-surface-variant', kolekcja)];
  t.x = f02k.x;
  t.y = f02k.y + f02k.height + 24;
  log.nota.push(sek.name + ': @' + Math.round(t.x) + ',' + Math.round(t.y) + ' ' + Math.round(t.width) + 'x' + Math.round(t.height));
}
return log;
