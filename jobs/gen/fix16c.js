//# opis: jeden blok Koniki i poprawne podsumowanie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f16 = sec.children.find(x => x.name === '16 Plan · tydzień');
const piatek = f16.findOne(n => /List - Plan, piątek/.test(n.name));
const wlasne = piatek.children.filter(c => c.componentProperties && JSON.stringify(c.componentProperties).indexOf('Koniki') >= 0);
const log = { znalezione: wlasne.length, pozycje: wlasne.map(c => Math.round(c.y)) };
// zostaje ten na wlasciwej godzinie
wlasne.sort((a, b) => b.y - a.y);
for (let i = 1; i < wlasne.length; i++) wlasne[i].remove();
log.zostalo = piatek.children.filter(c => c.componentProperties && JSON.stringify(c.componentProperties).indexOf('Koniki') >= 0).map(c => Math.round(c.y));
for (const t of f16.findAll(n => n.type === 'TEXT' && /W tym tygodniu/.test(n.characters))) {
  t.characters = 'W tym tygodniu: 22 lekcje, 3 zadania, 1 wydarzenie szkolne i własne zajęcia.';
  log.podsumowanie = t.characters;
}
await shot(f16, { scale: 0.7, name: 'vAF-16' });
return log;
