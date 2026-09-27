//# opis: czy etykieta Day ring udzwignie procent zamiast numeru dnia - pomiar, nie deklaracja
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const style = {}; (await figma.getLocalTextStylesAsync()).forEach(s => style[s.name] = s);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Day ring');
const proba = figma.createFrame();
proba.name = 'Próba procentu';
proba.layoutMode = 'HORIZONTAL'; proba.itemSpacing = 24; proba.paddingTop = 24; proba.paddingBottom = 24;
proba.paddingLeft = 24; proba.paddingRight = 24; proba.counterAxisAlignItems = 'CENTER';
proba.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
figma.currentPage.appendChild(proba);
proba.x = 4000; proba.y = -600;
const out = { pomiary: [] };
for (const [wariant, tekst] of [['State=Full, Tone=Neutral', '17'], ['State=Full, Tone=Neutral', '100%'],
                                ['State=Partial, Tone=Error', '17'], ['State=Partial, Tone=Error', '75%']]) {
  const inst = set.children.find(c => c.name === wariant).createInstance();
  proba.appendChild(inst);
  const p = inst.componentProperties;
  const k = Object.keys(p).find(y => y.split('#')[0] === 'Day');
  inst.setProperties({ [k]: tekst });
  const txt = inst.findOne(n => n.type === 'TEXT' && n.name === 'Day');
  const nazwaStylu = Object.keys(style).find(s => style[s].id === txt.textStyleId) || '?';
  // szerokosc samego napisu mierzymy na kopii poza instancja, bo w instancji ramka ma 44x44
  const kopia = txt.clone();
  figma.currentPage.appendChild(kopia);
  kopia.textAutoResize = 'WIDTH_AND_HEIGHT';
  out.pomiary.push({ wariant: wariant.split(',')[0], tekst, styl: nazwaStylu + ' ' + style[nazwaStylu].fontSize + ' px',
    szerokoscNapisu: Math.round(kopia.width), otworPierscienia: Math.round(36 * 0.72),
    mieściSię: kopia.width <= 36 * 0.72 });
  kopia.remove();
}
await shot(proba, { scale: 4, name: 't4-ring-procent' });
proba.remove();
return out;
