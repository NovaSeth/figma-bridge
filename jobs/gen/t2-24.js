//# opis: 24 Stan pusto (Plan) - zdanie nie moze obiecywac zastepstw, ktorych na tym koncie nigdy nie bedzie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const NOWE = 'Plan lekcji przyjdzie z Librusa, gdy szkoła go wpisze.';
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const f = sek.children.find(c => c.name === '24 Stan · pusto (Plan)');
  if (!f) { out.push({ sekcja: sek.name, stan: 'BRAK' }); continue; }
  const es = f.findOne(n => n.type === 'INSTANCE' && /Empty state/.test(n.name));
  if (!es) { out.push({ sekcja: sek.name, stan: 'brak Empty state' }); continue; }
  const p = es.componentProperties || {};
  const kB = Object.keys(p).find(y => y.split('#')[0] === 'Body');
  const przed = kB ? p[kB].value : null;
  if (kB && przed !== NOWE) es.setProperties({ [kB]: NOWE });
  out.push({ sekcja: sek.name, przed, po: NOWE, wysokosc: Math.round(f.height) });
  await shot(f, { scale: 0.8, name: 'final-24-' + (sek.name === 'Ciemny motyw' ? 'ciemny' : 'jasny') });
}
return out;
