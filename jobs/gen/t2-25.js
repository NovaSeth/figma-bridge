//# opis: 25 Stan - wygasla sesja Librusa (klon 20, baner Warning z akcja), oba motywy
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const mc = async n => { try { return await n.getMainComponentAsync(); } catch (e) { return null; } };
const TEKST = 'Librus wylogował FLibrusa. Pokazujemy ostatnie poprawne dane z 18.09.2026, 15:20. Żeby wróciły świeże dane, podaj hasło do Librusa na fl.monokoda.com.';
const ETYKIETA = 'Otwórz fl.monokoda.com';
const NAZWA = '25 Stan · wygasła sesja Librusa';
const wynik = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemna = sek.name === 'Ciemny motyw';
  try {
    const src = sek.children.find(c => c.name === '20 Stan · błąd odświeżania');
    if (!src) { wynik.push({ sekcja: sek.name, blad: 'brak 20' }); continue; }
    const stary = sek.children.find(c => c.name === NAZWA);
    if (stary) stary.remove();
    const f = src.clone();
    f.name = NAZWA;
    sek.appendChild(f);
    f.x = src.x; f.y = src.y + src.height + 600;
    let banner = null;
    for (const n of f.findAll(x => x.type === 'INSTANCE')) { const m = await mc(n); if (m && m.parent && m.parent.name === 'Banner') { banner = n; break; } }
    if (!banner) throw new Error('brak instancji Banner');
    const p = banner.componentProperties || {};
    const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
    banner.setProperties({ [k('Text')]: TEKST, [k('Show action')]: true, Tone: 'Warning' });
    const akcja = banner.findOne(n => n.type === 'INSTANCE' && n.name === 'Action');
    if (!akcja) throw new Error('brak przycisku Action w banerze');
    const pa = akcja.componentProperties || {};
    const ka = x => Object.keys(pa).find(y => y.split('#')[0] === x);
    const ust = {};
    if (ka('Label')) ust[ka('Label')] = ETYKIETA;
    if (ka('Show icon')) ust[ka('Show icon')] = false;    // to nie jest ponowienie, tylko wyjscie do przegladarki
    akcja.setProperties(ust);
    const tb = f.children.find(c => c.name === 'Tab bar');
    wynik.push({ sekcja: sek.name, wysokosc: Math.round(f.height), banerH: Math.round(banner.height), przyciskH: Math.round(akcja.height),
      przyciskW: Math.round(akcja.width), banerW: Math.round(banner.width), tab: tb ? tb.name : null });
    await shot(f, { scale: 0.7, name: 't2-25-' + (ciemna ? 'ciemny' : 'jasny') });
  } catch (e) { wynik.push({ sekcja: sek.name, blad: String(e && e.message ? e.message : e) }); }
}
return wynik;
