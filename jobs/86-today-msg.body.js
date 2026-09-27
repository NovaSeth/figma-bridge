//# #42: chip „dziś 15:13" na karcie i w arkuszu wiadomości na zielono
const GREEN = { 'Jasny motyw': { bg: '#CEEAD6', fg: '#0D652D' }, 'Ciemny motyw': { bg: '#0F5223', fg: '#A8DAB5' } };
let n = 0;
for (const { f, s } of screens()) { const g = GREEN[s.name];
  for (const chip of f.findAll(x => x.type === 'FRAME' && x.name === 'Chip' && x.cornerRadius === 8)) { const lab = texts(chip).find(t => !isIcon(t)); if (!lab || !/^dziś \d/.test(lab.characters)) continue;
    let inAction = false; for (let p = chip.parent; p && p !== f; p = p.parent) { if (p.name === 'Bottom sheet' || (p.cornerRadius === 20 && texts(p).some(t => t.characters === 'Ogarnięte'))) { inAction = true; break; } }
    if (!inAction) continue; chip.fills = solid(g.bg); for (const t of texts(chip)) t.fills = solid(g.fg); n++; } }
await shot(sections[0].children.find(x => x.name.startsWith('01 ')).children[1].findOne(x => x.type === 'FRAME' && x.cornerRadius === 20), { name: 'v-card', scale: 1 });
return { changed: n };
