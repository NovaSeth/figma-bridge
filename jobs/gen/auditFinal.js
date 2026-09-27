//# opis: koncowy audyt struktury makiet
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const wynik = { ekrany: 0, arkusze: 0, problemy: [] };
const ramki = sec.children.filter(c => c.type === 'FRAME');
for (const f of ramki) {
  wynik.ekrany++;
  const scrim = f.children.find(c => c.name === 'Scrim');
  const tabs = f.children.find(c => c.name === 'Tab bar');
  const main = f.children.find(c => c.name === 'Main Content');
  const fab = f.children.find(c => c.name === 'FAB');
  if (scrim) {
    wynik.arkusze++;
    if (Math.round(f.height) !== 874) wynik.problemy.push(f.name + ': arkusz na ' + Math.round(f.height) + ' px zamiast 874');
    if (Math.round(scrim.width) !== 402 || Math.round(scrim.height) !== 874) wynik.problemy.push(f.name + ': przyciemnienie ' + Math.round(scrim.width) + 'x' + Math.round(scrim.height));
    const sh = f.children.find(c => /sheet/i.test(c.name));
    if (sh && Math.round(sh.y + sh.height) !== 874) wynik.problemy.push(f.name + ': arkusz nie przy dole (' + Math.round(sh.y + sh.height) + ')');
  }
  if (tabs && Math.round(tabs.y + tabs.height) !== Math.round(f.height)) wynik.problemy.push(f.name + ': zakładki nie przy dole');
  if (fab && tabs && fab.y + fab.height > tabs.y) wynik.problemy.push(f.name + ': FAB nachodzi na zakładki');
  if (main && !scrim && main.layoutSizingVertical === 'FILL' && Math.round(f.height) === 874) { /* ok */ }
  if (Math.round(f.width) !== 402) wynik.problemy.push(f.name + ': szerokość ' + Math.round(f.width));
}
// kolizje ramek
for (let i = 0; i < ramki.length; i++) for (let j = i + 1; j < ramki.length; j++) {
  const a = ramki[i], b = ramki[j];
  if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) wynik.problemy.push('nachodzą: ' + a.name + ' × ' + b.name);
}
// nic luzem na stronie
wynik.luzne = page.children.filter(c => c.type !== 'SECTION').map(c => c.name);
return wynik;
