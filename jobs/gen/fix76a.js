//# opis: #76 ekrany z arkuszem do 874 + Main Content FILL
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const H = 874;
const log = { overlay: [], fill: [] };
const frames = [];
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) if (f.type === 'FRAME') frames.push({ sec: sec.name, f });
let i = 0;
for (const { sec, f } of frames) {
  i++; progress(i / frames.length, f.name);
  const scrim = f.children.find(c => c.name === 'Scrim');
  const mc = f.children.find(c => c.name === 'Main Content');
  if (scrim) {
    const overlays = f.children.filter(c => c.layoutPositioning === 'ABSOLUTE' && c !== scrim);
    // 1) ramka do wysokosci urzadzenia
    f.primaryAxisSizingMode = 'FIXED';
    f.resize(f.width, H);
    f.clipsContent = true;
    // 2) tresc wypelnia slack, zakladki na dole
    if (mc) { mc.layoutSizingVertical = 'FILL'; mc.layoutGrow = 1; }
    // 3) przyciemnienie na caly ekran
    scrim.x = 0; scrim.y = 0; scrim.resize(f.width, H);
    // 4) arkusze przyklejone do dolu, menu zostaje pod naglowkiem
    for (const o of overlays) {
      if (o.name.indexOf('sheet') >= 0 || o.name.indexOf('Sheet') >= 0) {
        if (o.height > H) o.resize(o.width, H);
        o.y = H - o.height;
      } else if (o.y + o.height > H) {
        o.y = Math.max(0, H - o.height);
      }
    }
    log.overlay.push({ sec, name: f.name, h: Math.round(f.height), overlays: overlays.map(o => o.name + '@' + Math.round(o.y)) });
  } else if (mc && (mc.layoutSizingVertical !== 'FILL' || mc.layoutGrow !== 1)) {
    mc.layoutSizingVertical = 'FILL'; mc.layoutGrow = 1;
    log.fill.push({ sec, name: f.name, h: Math.round(f.height) });
  }
}
return log;
