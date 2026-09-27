//# opis: #76 podpowiedzi w pustych polach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const s of figma.listAvailableFontsAsync ? [] : []) {}
const fonts = ['Regular','Medium','Semi Bold','Bold'];
for (const st of fonts) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const PLACEHOLDER = {
  'Search Input': 'Szukaj w wiadomościach',
  'Text Input': 'Wpisz temat',
  'Text Area': 'Napisz wiadomość…'
};
const REPLY = 'Napisz odpowiedź…';
const done = [];
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const inst of f.findAll(n => n.type === 'INSTANCE' && n.name.indexOf('Text field') >= 0)) {
    const props = inst.componentProperties || {};
    const key = Object.keys(props).find(k => k.indexOf('Value#') === 0);
    if (!key) continue;
    const v = props[key].value;
    if (v === null || String(v).trim() !== '') continue;
    const host = (inst.parent && inst.parent.name) || '';
    const base = host.split(':')[0];
    let text = PLACEHOLDER[base] || 'Wpisz treść';
    if (base === 'Text Area' && f.name.indexOf('Wiadomość') === 0) text = REPLY;
    inst.setProperties({ [key]: text });
    done.push({ screen: f.name, host: base, text });
  }
}
return done;
