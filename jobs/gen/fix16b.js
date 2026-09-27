//# opis: Koniki w kolumnie piatku + podsumowanie tygodnia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f16 = sec.children.find(x => x.name === '16 Plan · tydzień');
const piatek = f16.findOne(n => /List - Plan, piątek/.test(n.name));
const log = { przed: piatek.children.map(c => ({ n: c.name, y: Math.round(c.y), h: Math.round(c.height) })) };
// wzorzec: dowolny blok z tej kolumny, przelaczony na wariant wlasnych zajec
const wzor = piatek.children.find(c => c.type === 'INSTANCE' && c.name === 'Calendar event');
if (!wzor) return { blad: 'brak wzorca' };
const k = wzor.clone();
piatek.appendChild(k);
const p = k.componentProperties || {};
const kk = x => Object.keys(p).find(y => y.split('#')[0] === x);
const set = {};
if (kk('Kind')) set[kk('Kind')] = 'Own';
for (const nazwa of ['Title', 'Label', 'Name']) if (kk(nazwa)) set[kk(nazwa)] = 'Koniki';
for (const nazwa of ['Meta', 'Subtitle', 'Detail']) if (kk(nazwa)) set[kk(nazwa)] = '16:00–17:00';
k.setProperties(set);
// pozycja wg skali godzin: ta sama co w widoku dnia
// skala z istniejacych blokow: 7:45 -> y=39, 10:40 -> y=191
const pxNaMin = (191 - 39) / 175;
const minuty = (16 - 7) * 60;
k.y = Math.round(minuty * pxNaMin);
k.x = 0;
k.resize(piatek.width, Math.round(60 * pxNaMin));
log.dodany = { y: Math.round(k.y), h: Math.round(k.height), props: Object.keys(k.componentProperties).map(x => x.split('#')[0] + '=' + JSON.stringify(k.componentProperties[x].value)).join(' | ') };
// podsumowanie liczy tez wlasne zajecia
for (const t of f16.findAll(n => n.type === 'TEXT' && /W tym tygodniu/.test(n.characters))) {
  t.characters = 'W tym tygodniu: 22 lekcje, 3 zadania, 1 wydarzenie szkolne, 1 własne zajęcia.';
  log.podsumowanie = t.characters;
}
await shot(f16, { scale: 0.7, name: 'vAF-16' });
return log;
