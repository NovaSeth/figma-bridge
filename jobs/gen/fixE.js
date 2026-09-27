//# opis: drobiazgi: 02c, Oceny, wiersz Frekwencja
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = {};
// 1. treść ogłoszenia kończy się czysto w arkuszu
const f02c = sec.children.find(x => x.name === '02c Teraz · szczegóły ogłoszenia');
if (f02c) {
  const sheet = f02c.children.find(c => c.name === 'Bottom sheet');
  const body = sheet.children.find(c => c.name === 'Body');
  const dlugi = body.children.filter(c => c.type === 'TEXT').sort((a, b) => b.height - a.height)[0];
  if (dlugi) {
    dlugi.characters = 'Szanowni Uczniowie, Rodzice i Nauczyciele!\n18 września 2026 r. (piątek) nasza Szkoła bierze udział w akcji „Sprzątanie świata-Polska" pod hasłem: „SOS dla wody! Niech będzie wolna od śmieci". Uczniowie zaopatrzeni w worki i rękawiczki wraz z Nauczycielami będą porządkowali teren w pobliżu Szkoły.\n\nSzczegółowe informacje są na stronie fundacji „Nasza Ziemia" i na stronie akcji.';
    dlugi.name = 'Treść ogłoszenia';
    log.o02c = Math.round(dlugi.height);
  }
  body.layoutSizingVertical = 'HUG';
  sheet.layoutSizingVertical = 'HUG';
  if (sheet.height > 780) { body.layoutSizingVertical = 'FIXED'; }
  sheet.y = 874 - sheet.height;
  log.sheet02c = Math.round(sheet.height);
}
// 2. pusty stan Ocen bez opisu działania aplikacji
const f06 = sec.children.find(x => x.name === '06 Oceny');
if (f06) {
  for (const t of f06.findAll(n => n.type === 'TEXT' && /Pokażemy treść oceny|nie wyliczamy średniej/.test(n.characters))) {
    t.characters = 'Oceny opisowe pojawią się tutaj, gdy nauczyciele je wystawią.';
    log.o06 = 'zmieniony opis';
  }
}
// 3. wiersz Frekwencji mieści się w jednej linii
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const row of f.findAll(n => n.type === 'INSTANCE' && (n.name === 'List row' || n.name === 'Feed row'))) {
    const p = row.componentProperties || {};
    const kT = Object.keys(p).find(x => x.split('#')[0] === 'Title');
    if (!kT || !/^Frekwencja/.test(String(p[kT].value))) continue;
    const kS = Object.keys(p).find(x => x.split('#')[0] === 'Subtitle');
    const set = { [kT]: 'Frekwencja' };
    if (kS) set[kS] = 'Wrzesień: 0 nieobecności, 0 spóźnień';
    row.setProperties(set);
    log.frekwencja = (log.frekwencja || 0) + 1;
  }
}
await shot(f02c, { scale: 0.75, name: 'vE-02c' });
await shot(f06, { scale: 0.75, name: 'vE-06' });
return log;
