//# opis: uporzadkowanie kanwy DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const out = {};
for (const s of ds.children.filter(c => c.type === 'SECTION')) {
  out[s.name] = s.children.map(c => ({ n: c.name, t: c.type, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
}
// kolizje w sekcjach
const kolizje = [];
for (const [sekcja, el] of Object.entries(out)) {
  for (let i = 0; i < el.length; i++) for (let j = i + 1; j < el.length; j++) {
    const a = el[i], b = el[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) kolizje.push(sekcja + ': ' + a.n + ' × ' + b.n);
  }
}
return { kolizje, Atomy: out['Atomy'] ? out['Atomy'].slice(-6) : null, Molekuly: out['Molekuły'] ? out['Molekuły'].slice(-6) : null };
