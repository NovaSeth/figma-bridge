//# opis: Banner w DS: wspolna tresc + akcja
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[n]);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Banner');
const defs = set.componentPropertyDefinitions;
const kText = Object.keys(defs).find(k => k.split('#')[0] === 'Text');
const kText2 = Object.keys(defs).find(k => k.split('#')[0] === 'Text2');
const log = { kText, kText2 };

// 1. wszystkie warianty korzystają z jednej właściwości tekstu
for (const v of set.children) {
  const t = v.findOne(n => n.type === 'TEXT' && n.name === 'Text');
  if (t) t.componentPropertyReferences = Object.assign({}, t.componentPropertyReferences, { characters: kText });
}
if (kText2) { try { set.deleteComponentProperty(kText2); log.usunieteText2 = true; } catch (e) { log.usunieteText2 = e.message; } }

// 2. akcja w banerze
let kAkcja = Object.keys(set.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Action');
let kPokaz = Object.keys(set.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Show action');
if (!kAkcja) kAkcja = set.addComponentProperty('Action', 'TEXT', 'Spróbuj ponownie');
if (!kPokaz) kPokaz = set.addComponentProperty('Show action', 'BOOLEAN', false);
log.kAkcja = kAkcja; log.kPokaz = kPokaz;
const TON = { 'Tone=Success': 'color/on-success-container', 'Tone=Warning': 'color/warning-strong', 'Tone=Info': 'color/on-primary-container' };
for (const v of set.children) {
  if (v.findOne(n => n.name === 'Action')) continue;
  if (v.layoutMode !== 'VERTICAL') { v.layoutMode = 'VERTICAL'; v.counterAxisAlignItems = 'MIN'; }
  v.itemSpacing = Math.max(v.itemSpacing || 0, 6);
  const a = figma.createText();
  a.characters = 'Spróbuj ponownie';
  a.name = 'Action';
  if (S['label/md-strong']) await a.setTextStyleIdAsync(S['label/md-strong'].id);
  const token = TON[v.name] || 'color/on-surface';
  if (V[token]) a.fills = [paint(token)];
  a.textAutoResize = 'HEIGHT';
  v.appendChild(a);
  a.layoutSizingHorizontal = 'FILL';
  a.visible = false;
  a.componentPropertyReferences = { characters: kAkcja, visible: kPokaz };
}
set.description = (set.description || '').split('\n\nAkcja:')[0] + '\n\nAkcja: „Show action” pokazuje pod treścią etykietę akcji (np. „Spróbuj ponownie”). Ton dobiera kolor akcji.';
return log;
