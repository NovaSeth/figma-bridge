//# opis: widok roku na instancjach Calendar day mini
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar day mini');
const W = {}; for (const c of set.children) W[c.name.split('=')[1]] = c;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '18 Plan · rok');
const siatka = f.findOne(n => n.type === 'FRAME' && n.name === 'Rok 2026');
const WYDARZENIA = { 8: [11, 17, 21] };
const DZIS = { m: 8, d: 18 };
const NAZWY = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
let podmienione = 0;
let i = 0;
for (const karta of siatka.children) {
  i++; progress(i / siatka.children.length, karta.name);
  const m = NAZWY.findIndex(n => karta.name.indexOf(n) === 0);
  const dni = karta.findOne(n => n.name === 'Dni');
  if (!dni || m < 0) continue;
  const pierwszy = (new Date(Date.UTC(2026, m, 1)).getUTCDay() + 6) % 7;
  for (const stary of dni.children.slice()) {
    if (stary.type !== 'TEXT') continue;
    const d = parseInt(stary.characters, 10);
    if (isNaN(d)) continue;
    const poz = pierwszy + d - 1;
    const c = poz % 7;
    let stan = c >= 5 ? 'Weekend' : 'Default';
    if (m === DZIS.m && d === DZIS.d) stan = 'Today';
    else if ((WYDARZENIA[m] || []).indexOf(d) >= 0) stan = 'Event';
    const inst = W[stan].createInstance();
    dni.appendChild(inst);
    inst.x = stary.x + (stary.width - inst.width) / 2;
    inst.y = stary.y + (stary.height - inst.height) / 2;
    const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === 'Day');
    if (k) inst.setProperties({ [k]: String(d) });
    stary.remove();
    podmienione++;
  }
  // stare kółka markerów już niepotrzebne
  for (const e of dni.children.slice()) if (e.type === 'ELLIPSE') e.remove();
}
await shot(f, { scale: 0.8, name: 'vY-18' });
return { podmienione };
