//# opis: #91 pole Do bez chipa roli
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const sheet = f.children.find(c => c.name === 'Bottom sheet');
  if (!sheet) continue;
  const body = sheet.children.find(c => c.name === 'Body');
  if (!body) continue;
  // blok pola "Do"
  for (const blok of body.findAll(n => n.type === 'FRAME' && n.findAll && n.findAll(t => t.type === 'TEXT' && t.characters.trim() === 'Do').length)) {
    const chipy = blok.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name));
    for (const ch of chipy) {
      const kL = Object.keys(ch.componentProperties || {}).find(x => x.split('#')[0] === 'Label');
      const etykieta = kL ? String(ch.componentProperties[kL].value) : '';
      if (!/Wychowawczyni|Wychowawca|Nauczyciel/i.test(etykieta)) continue;
      const opak = ch.parent && ch.parent.children.length === 1 ? ch.parent : ch;
      log.push({ screen: f.name, usuniety: etykieta, opakowanie: opak.name });
      opak.remove();
    }
  }
  if (log.length) { sheet.y = 874 - sheet.height; await shot(f, { scale: 0.7, name: 'vAH-' + f.name.split(' ')[0] }); }
}
return log;
