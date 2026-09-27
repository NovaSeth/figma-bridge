//# opis: karta zasady wchodzi na tablice Start
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const start = ds.children.find(c => c.type === 'SECTION' && c.name === 'Start');
const board = start.children.find(c => /board/i.test(c.name));
const karta = start.children.find(c => c.name === 'Zasada: makieta w całości z systemu');
if (!board || !karta) return { stan: 'brak', dzieci: start.children.map(c => c.name) };
board.appendChild(karta);
karta.layoutSizingHorizontal = board.layoutMode === 'VERTICAL' ? 'FILL' : 'HUG';
await shot(start, { scale: 0.3, name: 'vDSf-Start' });
return { dzieci: start.children.map(c => c.name), naTablicy: board.children.map(c => c.name).slice(-3) };
