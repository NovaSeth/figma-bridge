//# opis: jedna os 16 px, cudzyslowy, odmiana, wiersz Frekwencji
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = { sekcje: 0, cudzyslowy: [], odmiana: [], frekwencja: 0, nbsp: [], chip: [] };
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const setText = (t, v) => {
  let n = t.parent; const old = t.characters;
  while (n && n.type !== 'PAGE') {
    if (n.type === 'INSTANCE' && n.componentProperties) {
      const k = Object.keys(n.componentProperties).find(x => n.componentProperties[x].type === 'TEXT' && n.componentProperties[x].value === old);
      if (k) { n.setProperties({ [k]: v }); return true; }
    }
    n = n.parent;
  }
  try { t.characters = v; return true; } catch (e) { return false; }
};
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const main = f.children.find(c => c.name === 'Main Content');
  // 1. nagłówki sekcji, legendy i stopki w linii z kartami
  if (main) {
    for (const c of main.children) {
      if (/Section heading|Legenda|Foot/.test(c.name) && 'paddingLeft' in c) { try { c.paddingLeft = 0; c.paddingRight = 0; } catch (e) {} log.sekcje++; }
      if (c.name === 'Cover top bar' && 'paddingLeft' in c) { try { c.paddingLeft = 0; c.paddingRight = 0; } catch (e) {} }
    }
    for (const c of main.findAll(n => n.type === 'INSTANCE' && n.name === 'Section heading')) { try { c.paddingLeft = 0; c.paddingRight = 0; log.sekcje++; } catch (e) {} }
  }
  // 2. cudzysłowy, odmiana, twarda spacja przy inicjale
  for (const t of f.findAll(n => n.type === 'TEXT')) {
    const stary = t.characters;
    let nowy = stary;
    // „tekst" → „tekst"
    nowy = nowy.replace(/„([^„"”]*)"/g, '„$1”');
    nowy = nowy.replace(/\b0 z (\d+) zamknięte/g, '0 z $1 zamkniętych');
    nowy = nowy.replace(/([A-ZĄĆĘŁŃÓŚŹŻ])\.\s([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/g, '$1. $2');
    nowy = nowy.replace('Widoczne 13 do 20 września', 'Widoczne 13–20 września');
    if (nowy !== stary) {
      setText(t, nowy);
      if (/”/.test(nowy) && !/”/.test(stary)) log.cudzyslowy.push(f.name);
      if (/zamkniętych/.test(nowy) && !/zamkniętych/.test(stary)) log.odmiana.push(f.name);
      if (/ /.test(nowy)) log.nbsp.push(f.name);
      if (/13–20/.test(nowy)) log.chip.push(f.name);
    }
  }
  // 3. wiersz Frekwencji: krótki podtytuł, żeby nie zawijał się wokół 100%
  for (const row of f.findAll(n => n.type === 'INSTANCE' && (n.name === 'List row' || n.name === 'Feed row'))) {
    const p = row.componentProperties || {};
    const kT = Object.keys(p).find(x => x.split('#')[0] === 'Title');
    if (!kT || String(p[kT].value) !== 'Frekwencja') continue;
    const kS = Object.keys(p).find(x => x.split('#')[0] === 'Subtitle');
    if (kS) { row.setProperties({ [kS]: 'Wrzesień bez nieobecności' }); log.frekwencja++; }
  }
}
log.cudzyslowy = [...new Set(log.cudzyslowy)];
log.nbsp = [...new Set(log.nbsp)];
return log;
