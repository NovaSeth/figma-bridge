//# opis: tytul ekranu 14
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const f = sek.children.find(x => x.name === '14 Nowa wiadomość · błędy walidacji');
  if (!f) continue;
  const pasek = f.findOne(n => n.type === 'INSTANCE' && n.name === 'Cover top bar');
  if (!pasek) continue;
  const t = pasek.findOne(n => n.type === 'TEXT');
  if (t) { t.characters = 'Nowa wiadomość'; log.push(sek.name); }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f14 = sec.children.find(x => x.name === '14 Nowa wiadomość · błędy walidacji');
await shot(f14, { scale: 0.7, name: 'vE3-14' });
return log;
