//# opis: #79/#80 ramka i separatory w liscie w arkuszu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f01 = light.children.find(x => x.name === '01 Teraz');
const wzor = f01.findOne(n => n.name === 'Separator' && n.type === 'RECTANGLE');
if (!wzor) throw new Error('brak wzorcowego separatora');
const out = [];
for (const f of light.children) {
  if (f.type !== 'FRAME') continue;
  const sheet = f.children.find(c => c.name === 'Bottom sheet');
  if (!sheet) continue;
  const body = sheet.children.find(c => c.name === 'Body');
  if (!body) continue;
  for (const list of body.findAll(n => n.name === 'List' && n.type === 'FRAME')) {
    const rows = list.children.filter(c => c.type === 'INSTANCE');
    if (rows.length < 1) continue;
    const rec = { screen: f.name, przed: Math.round(list.height), rzedy: rows.length };
    // ramka wokół listy
    list.strokes = wzor.fills && wzor.fills.length ? [Object.assign({}, wzor.fills[0])] : list.strokes;
    if (wzor.boundVariables && wzor.boundVariables.fills && wzor.boundVariables.fills[0]) {
      const v = await figma.variables.getVariableByIdAsync(wzor.boundVariables.fills[0].id);
      if (v) list.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)];
    }
    list.strokeWeight = 1;
    list.strokeAlign = 'INSIDE';
    list.clipsContent = true;
    // separatory między wierszami
    for (const old of list.children.filter(c => c.name === 'Separator')) old.remove();
    const fresh = list.children.filter(c => c.type === 'INSTANCE');
    for (let i = fresh.length - 1; i > 0; i--) {
      const sep = wzor.clone();
      list.insertChild(list.children.indexOf(fresh[i]), sep);
      sep.layoutSizingHorizontal = 'FILL';
      sep.resize(sep.width, 1);
    }
    list.layoutSizingVertical = 'HUG';
    rec.po = Math.round(list.height);
    out.push(rec);
  }
  const sh = f.children.find(c => c.name === 'Bottom sheet');
  if (sh) sh.y = 874 - sh.height;
}
return out;
