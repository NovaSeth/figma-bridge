// Ustawienia: usunięcie pustej przerwy pod tytułem
const f = sections[0].children.find(n => n.name.startsWith('02g')), main = f.children[1];
const marker = main.findOne(n => n.name === 'Settings'); if (marker) marker.visible = false;
const firstHeading = main.children.find(c => c.name === 'Heading 2'); if (firstHeading) firstHeading.paddingTop = 8;
main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); main.layoutSizingVertical = 'FILL'; }
relayout();
await shot(f, { name: 'v-02g', scale: 0.5 });
return { h: Math.round(f.height) };
