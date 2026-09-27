//# opis: wysokosc 08c z tresci
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sec of page.children.filter(c => c.type === 'SECTION')) {
  const e = sec.children.find(c => c.name === '08c Wiadomość · z załącznikami');
  const m = e.children.find(c => c.name === 'Main Content');
  m.layoutGrow = 0;
  m.primaryAxisSizingMode = 'AUTO';
  e.primaryAxisSizingMode = 'AUTO';
  out.push(sec.name + ': ' + Math.round(e.height) + ' (main ' + Math.round(m.height) + ')');
}
return out;
