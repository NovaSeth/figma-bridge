//# opis: wlasne zajecia w widoku tygodnia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f15 = sec.children.find(x => x.name === '15 Plan · dzień');
const f16 = sec.children.find(x => x.name === '16 Plan · tydzień');
// wzorzec: blok wlasnych zajec z widoku dnia
const koniki = f15.findOne(n => n.type === 'INSTANCE' && n.name === 'Calendar event' && JSON.stringify(n.componentProperties || {}).indexOf('Koniki') >= 0);
const grid16 = f16.findOne(n => n.type === 'FRAME' && n.name === 'TimeGrid');
const opis = { koniki: !!koniki, kolumny: [] };
if (grid16) {
  const kontener = grid16.children.find(c => c.layoutPositioning !== 'ABSOLUTE' && c.findOne && c.findOne(n => /List - Plan/.test(n.name)));
  if (kontener) opis.kolumny = kontener.findAll(n => /List - Plan/.test(n.name)).map(n => ({ n: n.name, kids: n.children.length, h: Math.round(n.height) }));
}
opis.podsumowanie = f16.findAll(n => n.type === 'TEXT' && /W tym tygodniu/.test(n.characters)).map(n => n.characters);
return opis;
