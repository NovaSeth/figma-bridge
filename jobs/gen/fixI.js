//# opis: wielokropki, marginesy naglowka, wyrownanie sekcji, przycisk Archiwizuj
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { kropki: [], naglowek: [], sekcje: [], archiwizuj: [] };
const setText = async (t, v) => {
  let n = t.parent; const old = t.characters;
  while (n && n.type !== 'PAGE') {
    if (n.type === 'INSTANCE' && n.componentProperties) {
      const k = Object.keys(n.componentProperties).find(x => n.componentProperties[x].type === 'TEXT' && n.componentProperties[x].value === old);
      if (k) { n.setProperties({ [k]: v }); return true; }
    }
    n = n.parent;
  }
  try { t.characters = v; return true; } catch (e) { return false; }
};
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  // 1. koniec zapowiedzi: jeden wielokropek
  for (const t of f.findAll(n => n.type === 'TEXT' && /(\.\s*…|…\s*\.|\.{4,})\s*$/.test(n.characters))) {
    const stary = t.characters;
    const nowy = stary.replace(/[.\s…]+$/, '…');
    if (nowy !== stary) { await setText(t, nowy); log.kropki.push({ screen: f.name, na: nowy.slice(-32) }); }
  }
  // 2. nagłówek aplikacji symetryczny wobec treści
  const hdr = f.children.find(c => c.name === 'App header' || c.name === 'Cover top bar');
  if (hdr && 'paddingLeft' in hdr) {
    const przed = [hdr.paddingLeft, hdr.paddingRight];
    try { hdr.paddingLeft = 16; hdr.paddingRight = 16; log.naglowek.push({ screen: f.name, przed, po: [16, 16] }); } catch (e) { log.naglowek.push({ screen: f.name, blad: e.message }); }
  }
}
return log;
