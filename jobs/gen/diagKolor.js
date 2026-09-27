//# opis: dwa kolory poza tokenami
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const wInstancji = n => { let k = n.parent; while (k) { if (k.type === 'INSTANCE') return true; k = k.parent; } return false; };
const out = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const n of f.findAll(() => true)) {
    if (wInstancji(n)) continue;
    if (!('fills' in n) || !n.fills || n.fills === figma.mixed || !n.fills.length) continue;
    const b = n.boundVariables && n.boundVariables.fills && n.boundVariables.fills.length;
    const widoczny = n.fills.some(x => x.visible !== false && x.type === 'SOLID');
    if (widoczny && !b) out.push({ ekran: f.name, n: n.name, t: n.type, rodzic: n.parent.name,
      rgb: n.fills.filter(x => x.type === 'SOLID').map(x => [Math.round(x.color.r*255), Math.round(x.color.g*255), Math.round(x.color.b*255)]) });
  }
}
// czy karty miesiecy i arkusze maja tokeny
const f18 = sec.children.find(x => x.name === '18 Plan · rok');
const karta = f18.findOne(n => n.name === 'Styczeń 2026');
const f02 = sec.children.find(x => x.name === '02 Teraz · szczegóły sprawy (arkusz)');
const sh = f02.children.find(c => c.name === 'Bottom sheet');
return { poza: out, kartaToken: !!(karta && karta.boundVariables && karta.boundVariables.fills), arkuszToken: !!(sh && sh.boundVariables && sh.boundVariables.fills), arkuszEfekt: sh ? !!sh.effectStyleId : null };
