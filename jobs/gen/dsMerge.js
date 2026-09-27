//# opis: Day badge wchodzi do Calendar day, dublety znikaja
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = {};
// 1. Calendar day mini + Day badge -> Calendar day z rozmiarem
const mini = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar day mini');
const badge = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Day badge');
if (mini) {
  for (const c of mini.children) if (!/Size=/.test(c.name)) c.name = c.name + ', Size=Mini';
  if (badge) {
    for (const c of badge.children.slice()) {
      const stan = c.name.match(/State=([^,]+)/)[1];
      c.name = 'State=' + stan + ', Size=Badge';
      mini.appendChild(c);
    }
    badge.remove();
  }
  // brakujące kombinacje, żeby zestaw był pełny
  const stany = ['Default', 'Weekend', 'Outside', 'Event', 'Today'];
  for (const s of stany) {
    if (mini.children.find(c => c.name === 'State=' + s + ', Size=Badge')) continue;
    const wzor = mini.children.find(c => c.name === 'State=' + s + ', Size=Mini');
    const k = wzor.clone();
    k.name = 'State=' + s + ', Size=Badge';
    mini.appendChild(k);
    k.resize(28, 28);
    const marker = k.findOne(n => n.type === 'ELLIPSE');
    if (marker) { marker.resize(26, 26); marker.x = 1; marker.y = 1; }
    const t = k.findOne(n => n.type === 'TEXT');
    if (t) { t.resize(28, 28); t.x = 0; t.y = 0; const S = (await figma.getLocalTextStylesAsync()).find(x => x.name === 'calendar/day'); if (S) await t.setTextStyleIdAsync(S.id); }
  }
  mini.name = 'Calendar day';
  mini.description = 'Dzień w kalendarzu bez pierścienia. Size=Mini w miniaturach roku, Size=Badge w nagłówku tygodnia. Stan odpowiada roli dnia: Weekend i Outside są wygaszone, Event ma tło, Today jest wypełniony.';
  let x = 0, y = 0;
  for (const c of mini.children) { c.x = x; c.y = y; x += c.width + 16; if (x > 300) { x = 0; y += 44; } }
  mini.primaryAxisSizingMode = 'AUTO'; mini.counterAxisSizingMode = 'AUTO';
  log.calendarDay = mini.children.map(c => c.name);
}
// 2. zdublowane komponenty znikają
for (const n of ds.findAll(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && /^(Calendar chip|Legend item)$/.test(x.name))) { log[n.name] = 'usunięty'; n.remove(); }
return log;
