//# opis: czy tresc nie chowa sie pod zakladkami
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const out = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const main = f.children.find(c => c.name === 'Main Content');
  const tabs = f.children.find(c => c.name === 'Tab bar');
  if (!main || !tabs) continue;
  const ostatni = main.children[main.children.length - 1];
  if (!ostatni) continue;
  const dolTresci = main.y + ostatni.y + ostatni.height;
  const goraZakladek = tabs.y;
  out.push({ screen: f.name, mainSizV: main.layoutSizingVertical, padB: main.paddingBottom,
    dolTresci: Math.round(dolTresci), goraZakladek: Math.round(goraZakladek), zapas: Math.round(goraZakladek - dolTresci), ostatni: ostatni.name });
}
return out.filter(o => o.zapas < 8);
