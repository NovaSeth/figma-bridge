//# opis: usuniecie odnosnika do Librusa + styl dla malych liczb w roku
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { usuniete: [], styl: null, przypisane: 0 };
// 1. zakaz odsyłania do Librusa
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const n of f.findAll(x => x.name === 'LibrusLink')) {
    const wrap = n.parent && /margin/.test(n.parent.name) ? n.parent : n;
    log.usuniete.push(f.name);
    wrap.remove();
  }
}
// 2. styl tekstu dla miniatur miesięcy
const style = await figma.getLocalTextStylesAsync();
let mini = style.find(s => s.name === 'calendar/day-mini');
if (!mini) {
  mini = figma.createTextStyle();
  mini.name = 'calendar/day-mini';
  mini.fontName = { family: 'Inter', style: 'Regular' };
  mini.fontSize = 9;
  mini.lineHeight = { unit: 'PIXELS', value: 12 };
  mini.letterSpacing = { unit: 'PERCENT', value: 0 };
  mini.description = 'Liczby dni w miniaturach miesięcy (widok roku). Najmniejszy dopuszczalny rozmiar w produkcie.';
}
let miniStrong = style.find(s => s.name === 'calendar/day-mini-strong');
if (!miniStrong) {
  miniStrong = figma.createTextStyle();
  miniStrong.name = 'calendar/day-mini-strong';
  miniStrong.fontName = { family: 'Inter', style: 'Semi Bold' };
  miniStrong.fontSize = 9;
  miniStrong.lineHeight = { unit: 'PIXELS', value: 12 };
  miniStrong.description = 'Wyróżniony dzień w miniaturze miesiąca: dziś albo dzień z wydarzeniami.';
}
log.styl = [mini.name, miniStrong.name];
// 3. przypisanie stylu w widoku roku
const f18 = sec.children.find(x => x.name === '18 Plan · rok');
for (const t of f18.findAll(n => n.type === 'TEXT' && /^\d{1,2}$/.test(n.characters.trim()))) {
  const mocny = t.fontName && t.fontName.style === 'Semi Bold';
  await t.setTextStyleIdAsync(mocny ? miniStrong.id : mini.id);
  log.przypisane++;
}
log.usuniete = [...new Set(log.usuniete)];
return log;
