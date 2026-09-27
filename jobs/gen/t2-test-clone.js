//# opis: test - ktory krok klonowania wariantu pada
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = [];
const proba = async (nazwa, fn) => { try { const r = await fn(); log.push('OK ' + nazwa + (r !== undefined ? ' -> ' + r : '')); return r; } catch (e) { log.push('PAD ' + nazwa + ': ' + (e && e.message ? e.message : e)); return null; } };
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
const src = set.children.find(c => c.name === 'Tone=Neutral, Kind=Icon');
let kl = await proba('clone', () => { const k = src.clone(); return k.id + ' rodzic=' + (k.parent ? k.parent.name + '/' + k.parent.type : 'brak'); });
const k = set.children.find(c => c.id !== src.id && /Kind=Icon/.test(c.name) && c.name === src.name) || figma.currentPage.findOne(n => n.type === 'COMPONENT' && n.name === src.name && n.id !== src.id);
log.push('znaleziony klon: ' + (k ? k.id + ' w ' + k.parent.name : 'BRAK'));
let txt = await proba('createText', () => { const t = figma.createText(); t.characters = '4'; return t.id + ' rodzic=' + (t.parent?t.parent.name:'brak'); });
const t = figma.currentPage.findOne(n => n.type === 'TEXT' && n.characters === '4' && n.parent === figma.currentPage);
if (t) {
  const style = {}; (await figma.getLocalTextStylesAsync()).forEach(s => style[s.name] = s);
  await proba('setTextStyle', async () => { await t.setTextStyleIdAsync(style['title/md'].id); return 'ok'; });
  await proba('remove text', () => { t.remove(); return 'ok'; });
}
if (k && k.id !== src.id) await proba('remove clone', () => { k.remove(); return 'ok'; });
return log;
