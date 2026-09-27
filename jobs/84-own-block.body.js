//# #40: dokończenie bloku własnych zajęć w widoku dnia
const GREEN = { 'Jasny motyw': { bg: '#CEEAD6', fg: '#0D652D' }, 'Ciemny motyw': { bg: '#0F5223', fg: '#A8DAB5' } };
const log = [];
for (const { f, s } of screens()) {
  if (!/^15/.test(f.name)) continue;
  const g = GREEN[s.name], main = f.children[1];
  if (texts(main).some(t => t.characters === 'Koniki')) continue;
  const blocks = main.findAll(n => n.type === 'FRAME' && n.cornerRadius === 9 && texts(n).some(t => t.characters === 'Edukacja wczesnoszkolna'));
  const byY = {}; for (const b of blocks) (byY[Math.round(b.y)] = byY[Math.round(b.y)] || []).push(b);
  const dup = Object.values(byY).find(a => a.length > 1);
  let b = dup ? dup[dup.length - 1] : null;
  if (!b && blocks.length) { b = blocks[0].clone(); blocks[0].parent.appendChild(b); }
  if (!b) { log.push(f.name + ': brak bloku'); continue; }
  b.y = 9 * 60; b.resize(b.width, 60); b.fills = solid(g.bg);
  const ts = texts(b); await setText(ts[0], 'Koniki'); if (ts[1]) await setText(ts[1], '16:00 do 17:00, własne zajęcia'); for (const t of ts) t.fills = solid(g.fg);
  for (const t of texts(main).filter(t => /^4 lekcje, od 7:45/.test(t.characters) && !t.characters.includes('Koniki'))) await setText(t, t.characters.replace('Sprzątanie Świata.', 'Sprzątanie Świata. Koniki o 16:00.'));
  log.push(f.name.slice(0, 26) + ': ok (duplikat=' + !!dup + ')');
}
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('15 '), { name: 'v-15', scale: 0.5 });
await shot(get('15a'), { name: 'v-15a', scale: 0.7 });
return log;
