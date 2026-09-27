//# opis: porzadkowanie zestawu Calendar day
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && (n.name === 'Calendar day mini' || n.name === 'Calendar day'));
const log = { przed: set.children.map(c => c.name) };
// nazwy po scaleniu
for (const c of set.children) {
  if (/State=Day badge/.test(c.name)) {
    const stan = /Size=Today/.test(c.name) ? 'Today' : 'Default';
    c.name = 'State=' + stan + ', Size=Badge';
  }
}
// pelny zestaw kombinacji
for (const s of ['Default', 'Weekend', 'Outside', 'Event', 'Today']) {
  if (set.children.find(c => c.name === 'State=' + s + ', Size=Badge')) continue;
  const wzor = set.children.find(c => c.name === 'State=' + s + ', Size=Mini');
  if (!wzor) continue;
  const k = wzor.clone();
  set.appendChild(k);
  k.name = 'State=' + s + ', Size=Badge';
  k.resize(28, 28);
  const m = k.findOne(n => n.type === 'ELLIPSE');
  if (m) { m.resize(26, 26); m.x = 1; m.y = 1; }
  const t = k.findOne(n => n.type === 'TEXT');
  if (t) { t.resize(28, 28); t.x = 0; t.y = 0; if (S['calendar/day']) await t.setTextStyleIdAsync(S['calendar/day'].id); }
}
set.name = 'Calendar day';
set.description = 'Dzień w kalendarzu bez pierścienia. Size=Mini w miniaturach roku, Size=Badge w nagłówku tygodnia. Weekend i Outside są wygaszone, Event ma tło, Today jest wypełniony.';
let x = 0, y = 0;
for (const c of set.children) { c.x = x; c.y = y; x += c.width + 16; if (x > 260) { x = 0; y += 44; } }
set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
log.po = set.children.map(c => c.name);
// dublety
for (const n of ds.findAll(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && /^(Calendar chip|Legend item)$/.test(x.name))) { log[n.name] = 'usunięty'; n.remove(); }
return log;
