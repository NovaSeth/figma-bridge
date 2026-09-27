//# #35: dolne menu przyklejone do dołu na krótkich ekranach
const report = [];
for (const { f } of screens()) {
  const nav = f.children.find(c => c.name.startsWith('Navigation')); const main = f.children[1];
  if (!nav || !main) continue;
  const gap = Math.round(f.height - (nav.y + nav.height));
  if (gap > 1) {
    const before = gap;
    main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1;
    const after = Math.round(f.height - (nav.y + nav.height));
    report.push(f.name.slice(0, 30) + ': luka ' + before + ' → ' + after + ' (h=' + Math.round(f.height) + ', main=' + main.layoutSizingVertical + ')');
  }
}
const f = await figma.getNodeByIdAsync('25:2');
await shot(f, { name: 'v-22', scale: 0.5 });
return report;
