//# opis: procent liczony jak w Librusie - spoznienie i zwolnienie to obecnosc (02i, 02j, 02k, 02h)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ustaw = (inst, mapa) => {
  const p = inst.componentProperties || {}; const out = {};
  for (const [nz, w] of Object.entries(mapa)) { const k = Object.keys(p).find(y => y.split('#')[0] === nz); if (k) out[k] = w; }
  if (Object.keys(out).length) inst.setProperties(out);
};
const wartosc = (inst, nz) => { const p = inst.componentProperties || {}; const k = Object.keys(p).find(y => y.split('#')[0] === nz); return k ? p[k].value : null; };
const STOPKA_02I = 'Zielony łuk to lekcje z obecnością, kolor reszty mówi, czego zabrakło; cały szary pierścień znaczy, że szkoła nic nie wpisała. Spóźnienie i zwolnienie Librus liczy do frekwencji jako obecność, więc procent jest wyższy niż łuk. Tapnij dzień, żeby zobaczyć lekcje.';
const PROCENTY_02K = { 'Wrzesień': '98%', 'Październik': '96%', 'Listopad': '95%', 'Grudzień': '94%',
  'Styczeń': '92%', 'Luty': '94%', 'Marzec': '94%', 'Kwiecień': '95%', 'Maj': '95%', 'Czerwiec': '94%' };
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const zapis = { sekcja: sek.name, zmiany: [], bledy: [] };
  // ---- 02i ----
  try {
    const f = sek.children.find(c => c.name === '02i Frekwencja · z nieobecnościami');
    const main = f.children.find(c => c.name === 'Main Content');
    const kpi = main.children.find(c => c.name === 'KPI card');
    ustaw(kpi, { Value: '86%', Title: 'Obecność na 73 z 85 lekcji' });
    const foot = main.children.find(c => c.name === 'Foot');
    const t = foot.findOne(n => n.type === 'TEXT');
    t.characters = STOPKA_02I; t.name = STOPKA_02I.slice(0, 60);
    zapis.zmiany.push('02i: ' + wartosc(kpi, 'Value') + ' / ' + wartosc(kpi, 'Title') + ' / stopka ' + Math.round(foot.height) + ' px');
    const ost = main.children[main.children.length - 1];
    zapis.zmiany.push('02i: dół treści ' + Math.round(ost.y + ost.height) + ' z 874, ramka ' + Math.round(f.height));
  } catch (e) { zapis.bledy.push('02i: ' + e.message); }
  // ---- 02j ----
  try {
    const f = sek.children.find(c => c.name === '02j Frekwencja · szczegóły dnia z nieobecnością');
    const opis = f.findOne(n => n.type === 'FRAME' && n.name === 'Opis');
    const teksty = opis.children.filter(c => c.type === 'TEXT');
    teksty[1].characters = 'Obecność na 6 z 8 lekcji'; teksty[1].name = 'Obecność na 6 z 8 lekcji';
    const sheet = f.children.find(c => c.name === 'Bottom sheet');
    sheet.y = 874 - sheet.height;
    zapis.zmiany.push('02j: podtytuł „' + teksty[1].characters + '", arkusz ' + Math.round(sheet.height) + ' @y' + Math.round(sheet.y));
  } catch (e) { zapis.bledy.push('02j: ' + e.message); }
  // ---- 02k ----
  try {
    const f = sek.children.find(c => c.name === '02k Frekwencja · rok');
    const main = f.children.find(c => c.name === 'Main Content');
    const kpi = main.children.find(c => c.name === 'KPI card');
    ustaw(kpi, { Value: '95%', Title: 'Obecność na 1134 z 1196 lekcji' });
    const karta = f.findOne(n => n.type === 'FRAME' && n.name === 'List');
    const ustawione = [];
    for (const r of karta.children.filter(c => c.type === 'INSTANCE')) {
      const nowy = PROCENTY_02K[r.name];
      if (!nowy) { zapis.bledy.push('02k: brak procentu dla ' + r.name); continue; }
      ustaw(r, { Value: nowy });
      ustawione.push(r.name + ' ' + nowy);
    }
    zapis.zmiany.push('02k: ' + wartosc(kpi, 'Value') + ' / ' + wartosc(kpi, 'Title') + ' / ramka ' + Math.round(f.height));
    zapis.zmiany.push('02k: ' + ustawione.join(', '));
  } catch (e) { zapis.bledy.push('02k: ' + e.message); }
  // ---- 02h: ten sam slot, ta sama konwencja co 02i ----
  try {
    const f = sek.children.find(c => c.name === '02h Frekwencja · szczegóły dnia');
    const kpi = f.findOne(n => n.type === 'INSTANCE' && n.name === 'KPI card');
    ustaw(kpi, { Detail: '0 nieobecności, 0 spóźnień' });
    zapis.zmiany.push('02h: detal „' + wartosc(kpi, 'Detail') + '", ramka ' + Math.round(f.height));
  } catch (e) { zapis.bledy.push('02h: ' + e.message); }
  wynik.push(zapis);
}
return wynik;
