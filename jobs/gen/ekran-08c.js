//# opis: 08c Wiadomosc - z zalacznikami
const NAZWA = '08c Wiadomość · z załącznikami';
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const ikonaZalacznik = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'Icon/attach_file');
const setProp = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) i.setProperties({ [k]: value }); return k; };
const log = [];
for (const sec of page.children.filter(c => c.type === 'SECTION')) {
  const stary = sec.children.find(c => c.name === NAZWA);
  if (stary) stary.remove();
  const baza = sec.children.find(c => c.name === '08 Wiadomość · wątek');
  const ekran = baza.clone();
  ekran.name = NAZWA;
  sec.appendChild(ekran);
  ekran.x = 4858; ekran.y = 5400;
  const main = ekran.children.find(c => c.name === 'Main Content');

  // 1. Otwieramy wiadomosc „Mala Ortografia" — te, ktora na liscie 07 i 08 ma
  //    juz chip „Zalacznik", a nie nowa korespondencje.
  const pasek = main.findOne(n => n.type === 'INSTANCE' && n.name === 'Cover top bar');
  setProp(pasek, 'Title', 'Mała Ortografia');
  const karta = main.findOne(n => n.type === 'INSTANCE' && n.name === 'Message card');
  setProp(karta, 'Meta', 'wychowawczyni, czw. 17 wrz, 8:05');
  setProp(karta, 'Body', 'Proszę Państwa, w załączniku przesyłam zdjęcia ćwiczeń ortograficznych do klasy 1. Proszę wydrukować i wkleić do zeszytu.');

  // 2. Blok zalacznikow. Karte, separator i drobny tekst klonujemy z ekranow
  //    TEJ SAMEJ sekcji — instancje zbudowane od nowa wzielyby kolory z kolekcji
  //    Color, a ekrany ciemne maja je nadpisane.
  const historia = main.children[3];
  const listaHist = historia.findOne(n => n.name === 'List' && n.type === 'FRAME');
  const marginWzor = main.children[1];            // 'Thread:margin' pad top 12

  const blok = marginWzor.clone();
  blok.name = 'Attachments:margin';
  blok.paddingTop = 16;
  for (const c of [...blok.children]) c.remove();
  main.insertChild(2, blok);

  const grupa = figma.createFrame();
  grupa.name = 'Attachments';
  grupa.fills = [];
  grupa.layoutMode = 'VERTICAL';
  grupa.itemSpacing = 8;
  blok.appendChild(grupa);
  grupa.layoutAlign = 'STRETCH';
  grupa.primaryAxisSizingMode = 'AUTO';

  // naglowek sekcji z ekranu 25 tej samej sekcji
  const zrodloNagl = sec.children.find(c => c.name === '25 Stan · wygasła sesja Librusa');
  let naglWzor = null;
  for (const i of zrodloNagl.findAll(n => n.type === 'INSTANCE' && n.name === 'Section heading')) { naglWzor = i; break; }
  const nagl = naglWzor.clone();
  grupa.appendChild(nagl);
  nagl.layoutAlign = 'STRETCH';
  setProp(nagl, 'Title', 'Załączniki (2)');
  setProp(nagl, 'Show subtitle', false);

  const karta2 = listaHist.clone();
  karta2.name = 'List';
  for (const c of [...karta2.children]) c.remove();
  grupa.appendChild(karta2);
  karta2.layoutAlign = 'STRETCH';

  // wiersz pliku: List row z kaflem ikony, wziety z ekranu 01 tej samej sekcji
  const zrodloWiersz = sec.children.find(c => c.name === '01 Teraz');
  let wierszWzor = null;
  for (const i of zrodloWiersz.findAll(n => n.type === 'INSTANCE' && n.name === 'List row')) {
    const mc = await i.getMainComponentAsync();
    if (mc && mc.name.indexOf('Leading=Icon tile') === 0) { wierszWzor = i; break; }
  }
  const separatorWzor = historia.findOne(n => n.name === 'Separator');
  const pliki = ['cwiczenia_ortograficzne_1.jpg', 'cwiczenia_ortograficzne_2.jpg'];
  for (let k = 0; k < pliki.length; k++) {
    if (k > 0) { const s = separatorWzor.clone(); karta2.appendChild(s); s.layoutAlign = 'STRETCH'; }
    const w = wierszWzor.clone();
    karta2.appendChild(w);
    w.layoutAlign = 'STRETCH';
    setProp(w, 'Trailing', 'None');
    setProp(w, 'Leading', 'Icon tile');
    setProp(w, 'Title', pliki[k]);
    setProp(w, 'Show chips top', false);
    setProp(w, 'Show chips', false);
    // Podtytul to typ pliku z API (`Attachment.contentType`), a nie nasz opis.
    // `sizeBytes` Librus zawsze oddaje puste, wiec rozmiaru nie ma.
    setProp(w, 'Show subtitle', true);
    setProp(w, 'Subtitle', 'image/jpeg');
    const kafel = w.children.find(n => n.type === 'INSTANCE' && n.name === 'Leading');
    if (kafel) {
      setProp(kafel, 'Tone', 'Primary');
      setProp(kafel, 'Kind', 'Icon');
      setProp(kafel, 'Icon', ikonaZalacznik.id);
    }
  }

  // Zdanie o tym, czego wiersz NIE robi: plikow nie umiemy jeszcze pobrac
  // (MessageThreadCover.swift, `showsAttachmentDownload == false`).
  const zrodloDrobne = sec.children.find(c => c.name === '15 Plan · dzień');
  const drobneWzor = zrodloDrobne.findOne(n => n.type === 'TEXT' && n.characters.indexOf('Zadania i wydarzenia') === 0);
  const drobne = drobneWzor.clone();
  drobne.name = 'Note';
  drobne.characters = 'Plików nie da się jeszcze otworzyć w aplikacji. Są w Librusie, przy tej wiadomości.';
  grupa.appendChild(drobne);
  drobne.layoutAlign = 'STRETCH';
  drobne.textAutoResize = 'HEIGHT';

  // 3. Historia korespondencji: dwie pozostale wiadomosci od tej samej osoby.
  const wiersze = listaHist.children.filter(n => n.type === 'INSTANCE');
  const dane = [
    { sub: 'Pocztówka z wakacji, informacja', prev: 'Proszę na poniedziałek 21 września przynieść pocztówkę z…', chip: 'czw.' },
    { sub: 'Ćwiczenia', prev: 'Dzień dobry, od dwóch dni Julia nie ma małych zielonych ćwic…', chip: '15:13' }
  ];
  wiersze.forEach((w, k) => {
    setProp(w, 'Subtitle', dane[k].sub);
    setProp(w, 'Preview', dane[k].prev);
    setProp(w, 'Show chip top 2', false);
    const chip = w.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip top 1');
    if (chip) setProp(chip, 'Label', dane[k].chip);
  });

  log.push({ sekcja: sec.name, h: Math.round(ekran.height) });
}
return log;
