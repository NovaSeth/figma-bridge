//# opis: plakietka nieprzeczytanych = 2, zgodnie z trescia ekranow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const NIEPRZECZYTANE = 2;
const log = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    const tabs = f.children.find(c => c.name === 'Tab bar');
    if (!tabs) continue;
    const zak = tabs.children.find(c => c.name === 'Tab Wiadomości');
    if (!zak) continue;
    const p = zak.componentProperties || {};
    const kS = Object.keys(p).find(x => x.split('#')[0] === 'Show badge');
    if (kS && p[kS].value !== true) zak.setProperties({ [kS]: true });
    const licz = zak.findOne(n => n.type === 'TEXT' && /^\d+$/.test(n.characters.trim()));
    if (licz && licz.characters.trim() !== String(NIEPRZECZYTANE)) { try { licz.characters = String(NIEPRZECZYTANE); } catch (e) { log.push({ blad: e.message }); } }
    log.push(sek.name + ' / ' + f.name);
  }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f07 = sec.children.find(x => x.name === '07 Wiadomości · odebrane');
await shot(f07.children.find(c => c.name === 'Tab bar'), { scale: 2, name: 'vE2-tabbar' });
const f08 = sec.children.find(x => x.name === '08 Wiadomość · wątek');
await shot(f08, { scale: 0.7, name: 'vE2-08' });
return { ekranow: log.length };
