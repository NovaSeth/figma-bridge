//# opis: na ile makiety trzymaja sie DS
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const KONTENERY = /^(Main Content|List|.*:margin|Teraz|Plan|Compose|Thread|MsgList|Container|Body|Text|Leading|Trailing|Chips|Chips top|Row|Col|Group|Frame|Wypełniacz|Spacer|Foot|Legenda|Kalendarz|Tydzień|Komórka|Dni|Dni tygodnia|Month bar|MonthGrid|TimeGrid|Details|Settings|Section|Field|Rok 2026)/;
const wynik = { ekrany: [], suma: { instancje: 0, wezly: 0, surowe: 0, tekstBezStylu: 0, kolorBezTokenu: 0 } };
const wInstancji = n => { let k = n.parent; while (k) { if (k.type === 'INSTANCE') return true; k = k.parent; } return false; };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const rec = { ekran: f.name, instancje: 0, wezly: 0, surowe: [], tekstBezStylu: 0, kolorBezTokenu: 0 };
  for (const n of f.findAll(() => true)) {
    rec.wezly++;
    if (n.type === 'INSTANCE' && !wInstancji(n)) rec.instancje++;
    if (wInstancji(n)) continue;
    if (n.type === 'TEXT') {
      if (!n.textStyleId || n.textStyleId === figma.mixed) rec.tekstBezStylu++;
    }
    if ('fills' in n && n.fills && n.fills !== figma.mixed && n.fills.length) {
      const b = n.boundVariables && n.boundVariables.fills && n.boundVariables.fills.length;
      const widoczny = n.fills.some(x => x.visible !== false && x.type === 'SOLID');
      if (widoczny && !b) rec.kolorBezTokenu++;
    }
    // ramka z tłem, która nie jest instancją ani znanym kontenerem
    if (n.type === 'FRAME' && n.fills && n.fills !== figma.mixed && n.fills.some(x => x.visible !== false && x.type === 'SOLID') && !KONTENERY.test(n.name)) {
      rec.surowe.push(n.name);
    }
  }
  rec.surowe = [...new Set(rec.surowe)];
  wynik.ekrany.push(rec);
  wynik.suma.instancje += rec.instancje; wynik.suma.wezly += rec.wezly;
  wynik.suma.surowe += rec.surowe.length; wynik.suma.tekstBezStylu += rec.tekstBezStylu; wynik.suma.kolorBezTokenu += rec.kolorBezTokenu;
}
return wynik;
