//# opis: pozycje ramek i nakladania
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const el = sec.children.map(c => ({ n: c.name, t: c.type, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
const ramki = el.filter(e => e.t === 'FRAME');
const kolizje = [];
for (let i = 0; i < ramki.length; i++) for (let j = i + 1; j < ramki.length; j++) {
  const a = ramki[i], b = ramki[j];
  if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) kolizje.push(a.n + ' × ' + b.n);
}
return { el, kolizje };
