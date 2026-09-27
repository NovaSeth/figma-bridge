//# opis: Icon tile - warianty Kind=Value (idempotentnie, ze sprzataniem po nieudanych probach)
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const style = {}; (await figma.getLocalTextStylesAsync()).forEach(s => style[s.name] = s);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const zm = n => vars.find(v => v.name === n && v.variableCollectionId === cLight.id);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
const klucz = Object.keys(set.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Value');
const TONY = [
  { t: 'Primary', kolor: 'color/on-primary', wart: '4' },
  { t: 'Success', kolor: 'color/on-success', wart: '5' },
  { t: 'Warning', kolor: 'color/on-primary', wart: '3' },
  { t: 'Neutral', kolor: 'color/on-surface', wart: '4' }
];
const log = [];
// sprzatanie po nieudanych przebiegach
for (const c of set.children.slice()) if (/Kind=Value/.test(c.name) && c.children.length === 0) { log.push('usunieto pusty wariant'); c.remove(); }
let i = 0;
for (const { t, kolor, wart } of TONY) {
  i++; progress(i / 4, 'Tone=' + t);
  const nazwa = 'Tone=' + t + ', Kind=Value';
  if (set.children.some(c => c.name === nazwa && c.children.length > 0)) { log.push('jest: ' + nazwa); continue; }
  try {
    const src = set.children.find(c => c.name === 'Tone=' + t + ', Kind=Icon');
    const kl = src.clone();
    kl.name = nazwa;
    set.appendChild(kl);
    for (const ch of kl.children.slice()) ch.remove();
    const txt = figma.createText();
    txt.characters = wart;
    await txt.setTextStyleIdAsync(style['title/md'].id);
    txt.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', zm(kolor))];
    txt.textAlignHorizontal = 'CENTER';
    txt.textAlignVertical = 'CENTER';
    txt.textAutoResize = 'WIDTH_AND_HEIGHT';
    kl.appendChild(txt);
    txt.componentPropertyReferences = { characters: klucz };   // klon gubi referencje
    txt.name = 'Value';
    log.push('dodano ' + nazwa);
  } catch (e) { log.push('PAD ' + nazwa + ': ' + (e && e.message ? e.message : e)); }
}
return { log, warianty: set.children.map(c => c.name + '(' + c.children.length + ')'), props: Object.keys(set.componentPropertyDefinitions), w: set.width, h: set.height };
