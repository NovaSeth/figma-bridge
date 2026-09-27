//# opis: 27 Stan - pierwsze uruchomienie (konto bez dziecka)
const NAZWA = '27 Stan · pierwsze uruchomienie';
const TYTUL = 'Nie ma jeszcze żadnego dziecka';
const TRESC = 'Wpisz dane logowania do Librusa w konsoli na komputerze — dzieci pojawią się tu same.';
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const setProp = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) i.setProperties({ [k]: value }); };
const log = [];
for (const sec of page.children.filter(c => c.type === 'SECTION')) {
  const stary = sec.children.find(c => c.name === NAZWA);
  if (stary) stary.remove();
  const baza = sec.children.find(c => c.name === '22 Stan · pusto (Zadania)');
  const ekran = baza.clone();
  ekran.name = NAZWA;
  sec.appendChild(ekran);
  ekran.x = 5380; ekran.y = 7100;

  // Konto bez dziecka nie ma czym wypelnic naglowka: POST /pair zwraca tylko
  // imie rodzica, a GET /children oddal pusta liste (AppShell.swift — naglowek
  // rysuje sie wylacznie `if let child`).
  ekran.children.find(c => c.name === 'App header').remove();

  const main = ekran.children.find(c => c.name === 'Main Content');
  main.primaryAxisAlignItems = 'CENTER';
  main.counterAxisAlignItems = 'CENTER';
  main.itemSpacing = 16;

  const pusto = main.findOne(n => n.type === 'INSTANCE' && n.name === 'Empty state');
  setProp(pusto, 'Title', TYTUL);
  setProp(pusto, 'Body', TRESC);
  pusto.layoutGrow = 0;
  pusto.layoutSizingVertical = 'HUG';
  pusto.layoutAlign = 'STRETCH';

  // Przycisk bierzemy z ekranu 25 TEJ SAMEJ sekcji: instancja zbudowana od nowa
  // wzielaby zmienne z kolekcji Color, a ekrany ciemne maja nadpisane kolory.
  const zrodlo = sec.children.find(c => c.name === '25 Stan · wygasła sesja Librusa');
  let wzor = null;
  for (const i of zrodlo.findAll(n => n.type === 'INSTANCE')) {
    const mc = await i.getMainComponentAsync();
    if (mc && mc.name === 'Style=Primary outline, State=Default') { wzor = i; break; }
  }
  const btn = wzor.clone();
  btn.name = 'Button';
  main.appendChild(btn);
  setProp(btn, 'Label', 'Spróbuj ponownie');
  setProp(btn, 'Show icon', false);
  btn.layoutAlign = 'INHERIT';
  btn.layoutSizingHorizontal = 'HUG';

  const tab = ekran.children.find(c => c.name === 'Tab bar');
  setProp(tab, 'Active', 'Teraz');
  // Plakietki licza to, co widac na ekranie Teraz — a Teraz sie nie wczytalo.
  // Zadnej liczby nie zmyslamy (AppShellModel.badges).
  for (const t of tab.children) if (t.type === 'INSTANCE') setProp(t, 'Show badge', false);

  ekran.primaryAxisSizingMode = 'FIXED';
  ekran.resize(402, 874);
  log.push({ sekcja: sec.name, h: Math.round(ekran.height), dzieci: ekran.children.map(c => c.name) });
}
return log;
