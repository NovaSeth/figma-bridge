//# opis: pelny przebieg jednego wariantu Kind=Value z logiem per krok
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = [];
const proba = async (nazwa, fn) => { try { const r = await fn(); log.push('OK ' + nazwa + (r !== undefined ? ' -> ' + r : '')); return r; } catch (e) { log.push('PAD ' + nazwa + ': ' + (e && e.message ? e.message : e)); throw e; } };
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
log.push('stan wejsciowy: ' + set.children.map(c => c.name + '(' + c.children.length + ')').join(' | ') + ' w=' + set.width);
// sprzatanie po nieudanych przebiegach: puste warianty Kind=Value
for (const c of set.children.slice()) if (/Kind=Value/.test(c.name) && c.children.length === 0) { c.remove(); log.push('usunieto pusty ' + c.name); }
const style = {}; (await figma.getLocalTextStylesAsync()).forEach(s => style[s.name] = s);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const zm = n => vars.find(v => v.name === n && v.variableCollectionId === cLight.id);
const nazwa = 'Tone=Neutral, Kind=Value';
if (!set.children.some(c => c.name === nazwa)) {
  const src = set.children.find(c => c.name === 'Tone=Neutral, Kind=Icon');
  const kl = await proba('clone', () => { const k = src.clone(); k.name = nazwa; return k.id; }) && set.children.concat(figma.currentPage.children).find(c => c.name === nazwa);
  const w = figma.currentPage.findOne(n => n.type === 'COMPONENT' && n.name === nazwa) || set.children.find(c => c.name === nazwa);
  await proba('append', () => { set.appendChild(w); return w.parent.type; });
  await proba('usun dzieci', () => { for (const ch of w.children.slice()) ch.remove(); return w.children.length; });
  const txt = await proba('createText', () => figma.createText());
  await proba('characters', () => { txt.characters = '4'; return txt.characters; });
  await proba('styl', async () => { await txt.setTextStyleIdAsync(style['title/md'].id); return 'ok'; });
  const v = zm('color/on-surface');
  await proba('zmienna', () => v ? v.name : 'BRAK');
  await proba('fill', () => { txt.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)]; return 'ok'; });
  await proba('align', () => { txt.textAlignHorizontal = 'CENTER'; txt.textAlignVertical = 'CENTER'; txt.textAutoResize = 'WIDTH_AND_HEIGHT'; return 'ok'; });
  await proba('append txt', () => { w.appendChild(txt); return txt.parent.name; });
  const klucz = Object.keys(set.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Value');
  await proba('ref', () => { txt.componentPropertyReferences = { characters: klucz }; return klucz; });
  await proba('nazwa txt', () => { txt.name = 'Value'; return 'ok'; });
}
log.push('stan koncowy: ' + set.children.map(c => c.name + '(' + c.children.length + ')').join(' | ') + ' w=' + set.width);
return log;
