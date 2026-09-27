//# opis: koncowa weryfikacja - pozycje, wysokosci obu motywow, zrzuty
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const NOWE = ['26 Stan · zasób niedostępny','25 Stan · wygasła sesja Librusa','06a Oceny · oceny cyfrowe','06b Oceny · oceny opisowe'];
const out = { rzedy: {}, porownanie: [] };
const sekcje = {};
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  sekcje[sek.name] = sek;
  out.rzedy[sek.name] = sek.children.filter(c => c.type === 'FRAME').sort((a,b)=>a.y-b.y||a.x-b.x)
    .map(c => `${c.name} @${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.width)}x${Math.round(c.height)}`);
}
const J = sekcje['Jasny motyw'], C = sekcje['Ciemny motyw'];
for (const nz of NOWE) {
  const a = J.children.find(c => c.name === nz), b = C.children.find(c => c.name === nz);
  out.porownanie.push({ ekran: nz, jasny: a ? Math.round(a.height) : null, ciemny: b ? Math.round(b.height) : null,
    zgodne: a && b ? Math.round(a.height) === Math.round(b.height) && Math.round(a.width) === Math.round(b.width) : false,
    xy: a ? [Math.round(a.x), Math.round(a.y)] : null });
  if (a) await shot(a, { scale: 0.7, name: 'final-' + nz.split(' ')[0] + '-jasny' });
  if (b) await shot(b, { scale: 0.7, name: 'final-' + nz.split(' ')[0] + '-ciemny' });
}
// kolizje w obu sekcjach
out.kolizje = [];
for (const sek of [J, C]) {
  const r = sek.children.filter(c => c.type === 'FRAME');
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const a = r[i], b = r[j];
    if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) out.kolizje.push(sek.name + ': ' + a.name + ' x ' + b.name);
  }
}
return out;
