//# opis: screeny ekranow z arkuszami
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const want = ['02 Teraz · szczegóły sprawy (arkusz)','02a Teraz · szczegóły na pełnym ekranie','02b Teraz · odpowiedź','02c Teraz · szczegóły ogłoszenia','02d Teraz · wybór dziecka','02e Teraz · zdjęcie dziecka','15a Plan · nowe zajęcia'];
const out = [];
let i = 0;
for (const sec of page.children) {
  if (sec.type !== 'SECTION') continue;
  for (const f of sec.children) {
    if (want.indexOf(f.name) < 0) continue;
    i++;
    progress(i / want.length, f.name);
    await shot(f, { scale: 0.5, name: 'sheet-' + f.name.split(' ')[0] });
    out.push({ name: f.name, h: Math.round(f.height), clip: f.clipsContent, kids: f.children.map(c => c.name + (c.layoutPositioning==='ABSOLUTE'?'(abs)':'') + ':' + Math.round(c.height)) });
  }
}
return out;
