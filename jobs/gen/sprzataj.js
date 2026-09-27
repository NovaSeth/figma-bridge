//# opis: usuniecie resztek po nieudanym skrypcie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const OCZEKIWANE = ['Rok 2026', 'Styczeń 2026', '1'];
const usuniete = [];
for (const c of page.children.slice()) {
  if (c.type === 'SECTION') continue;
  if (OCZEKIWANE.indexOf(c.name) < 0) { usuniete.push({ pominiety: c.name, type: c.type }); continue; }
  usuniete.push({ usuniety: c.name, type: c.type, w: Math.round(c.width), h: Math.round(c.height) });
  c.remove();
}
return { usuniete, zostalo: page.children.map(c => c.name + ':' + c.type) };
