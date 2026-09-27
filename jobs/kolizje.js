//# opis: kontrola kolizji ramek i zgodnosci wysokosci miedzy motywami
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sekcje = page.children.filter(c => c.type === 'SECTION');
const out = { sekcje: [], kolizje: [], rozjazdWysokosci: [] };
const mapy = {};
for (const s of sekcje) {
  const f = s.children.filter(c => c.type === 'FRAME')
    .map(c => ({ n: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
  out.sekcje.push({ nazwa: s.name, ekranow: f.length });
  mapy[s.name] = new Map(f.map(x => [x.n, x]));
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
    const a = f[i], b = f[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
      out.kolizje.push(`${s.name}: ${a.n} × ${b.n}`);
  }
}
const [jasny, ciemny] = [mapy['Jasny motyw'], mapy['Ciemny motyw']];
if (jasny && ciemny) for (const [n, a] of jasny) {
  const b = ciemny.get(n);
  if (!b) out.rozjazdWysokosci.push(`BRAK w ciemnym: ${n}`);
  else if (a.h !== b.h) out.rozjazdWysokosci.push(`${n}: jasny ${a.h} vs ciemny ${b.h}`);
}
for (const [n] of ciemny) if (!jasny.has(n)) out.rozjazdWysokosci.push(`BRAK w jasnym: ${n}`);
return out;
