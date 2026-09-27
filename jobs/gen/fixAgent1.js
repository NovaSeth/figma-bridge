//# opis: weekend w roku + teksty arkusza dnia
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[n]);
const log = {};
// 1. dzien roboczy ciemniejszy niz weekend
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar day');
log.dni = [];
for (const v of set.children) {
  const t = v.findOne(n => n.type === 'TEXT');
  if (!t) continue;
  if (/State=Default/.test(v.name)) { t.fills = [paint('color/on-surface', { r: 0.07, g: 0.07, b: 0.07 })]; log.dni.push(v.name + ' → on-surface'); }
  if (/State=(Weekend|Outside)/.test(v.name)) { t.fills = [paint('color/on-surface-variant', { r: 0.37, g: 0.39, b: 0.41 })]; log.dni.push(v.name + ' → on-surface-variant'); }
}
// 2. arkusz szczegolow dnia: odmiana i zgodnosc z planem
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '02h Frekwencja · szczegóły dnia');
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const body = sheet.children.find(c => c.name === 'Body');
for (const t of body.findAll(n => n.type === 'TEXT' && /z 4 lekcjach/.test(n.characters))) {
  t.characters = t.characters.replace('z 4 lekcjach', 'z 4 lekcji');
  log.odmiana = t.characters;
}
const LEKCJE = ['Język angielski', 'Edukacja wczesnoszkolna', 'Edukacja wczesnoszkolna', 'Religia'];
const lista = body.findOne(n => n.type === 'FRAME' && n.name === 'List');
let i = 0;
log.lekcje = [];
for (const w of lista.children.filter(c => /^Lekcja/.test(c.name))) {
  const nazwa = w.children.find(c => c.type === 'TEXT' && !/^\d\.$/.test(c.characters) && !/Obecność/.test(c.characters));
  if (nazwa && LEKCJE[i]) { nazwa.characters = LEKCJE[i]; log.lekcje.push((i + 1) + '. ' + LEKCJE[i]); }
  i++;
}
sheet.y = 874 - sheet.height;
await shot(f, { scale: 0.7, name: 'vAF-02h' });
const f18 = sec.children.find(x => x.name === '18 Plan · rok');
await shot(f18, { scale: 0.7, name: 'vAF-18' });
return log;
