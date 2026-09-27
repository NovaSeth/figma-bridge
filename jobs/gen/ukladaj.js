//# opis: rownomierne rozstawienie ramek w rzedach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sekcje = page.children.filter(s => s.type === 'SECTION');
const wynik = [];
for (const sec of sekcje) {
const RZEDY = [
  { y: 280, kolejnosc: ['01 Teraz','02 Teraz · szczegóły sprawy (arkusz)','02a Teraz · szczegóły na pełnym ekranie','02b Teraz · odpowiedź','02c Teraz · szczegóły ogłoszenia','02d Teraz · wybór dziecka','02e Teraz · zdjęcie dziecka','02f Teraz · frekwencja','02h Frekwencja · szczegóły dnia','02i Frekwencja · z nieobecnościami','02j Frekwencja · szczegóły dnia z nieobecnością','02k Frekwencja · rok','02g Teraz · ustawienia','03 Teraz · sprawy zamknięte','19 Stan · ładowanie','20 Stan · błąd odświeżania','21 Stan · pusto (Teraz)'] },
  { y: 2923, kolejnosc: ['04 Zadania','05 Zadania · zrobione i archiwum','05a Zadania · przywracanie z archiwum','22 Stan · pusto (Zadania)','06 Oceny','06a Oceny · oceny cyfrowe','06b Oceny · oceny opisowe'] },
  { y: 5400, kolejnosc: ['07 Wiadomości · odebrane','08 Wiadomość · wątek','08c Wiadomość · z załącznikami','09 Wiadomość · błąd walidacji','10 Wiadomość · odpowiedź wysłana','11 Wiadomości · wysłane (pusto)','12 Wiadomości · wysłane','13 Nowa wiadomość','14 Nowa wiadomość · błędy walidacji','23 Stan · pusto (Wiadomości)'] },
  { y: 7100, kolejnosc: ['15 Plan · dzień','15a Plan · nowe zajęcia','15b Plan · szczegóły oferty zajęć','15c Plan · zastępstwo i lekcja odwołana','16 Plan · tydzień','17 Plan · miesiąc','18 Plan · rok','24 Stan · pusto (Plan)','25 Stan · wygasła sesja Librusa','26 Stan · zasób niedostępny','27 Stan · pierwsze uruchomienie'] }
];
const KROK = 522, X0 = 160;
  const log = [];
  for (const r of RZEDY) {
  let x = X0;
  for (const nazwa of r.kolejnosc) {
    const f = sec.children.find(c => c.name === nazwa);
    if (!f) { log.push({ brak: nazwa }); continue; }
    f.x = x; f.y = r.y;
    x += KROK;
    log.push({ n: nazwa, x: Math.round(f.x), y: Math.round(f.y), h: Math.round(f.height) });
  }
}
  const ramki = sec.children.filter(c => c.type === 'FRAME');
  const kolizje = [];
  for (let i = 0; i < ramki.length; i++) for (let j = i + 1; j < ramki.length; j++) {
    const a = ramki[i], b = ramki[j];
    if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) kolizje.push(a.name + ' × ' + b.name);
  }
  wynik.push({ sekcja: sec.name, ustawione: log.length, kolizje, nieznalezione: log.filter(l => l.brak) });
}
return wynik;
