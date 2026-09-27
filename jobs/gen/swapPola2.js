//# opis: Reply field, Input -> Text field; Quote -> DS Quote
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const setTF = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Text field');
const wMulti = setTF.children.find(c => /Multiline, State=Focus/.test(c.name));
const wSingle = setTF.children.find(c => /Single, State=Empty/.test(c.name));
const compQ = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'Quote');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
const podmien = (stary, wzor, ustaw) => {
  const rodzic = stary.parent;
  const idx = rodzic.children.indexOf(stary);
  const wys = stary.height;
  const inst = wzor.createInstance();
  rodzic.insertChild(idx, inst);
  inst.layoutSizingHorizontal = 'FILL';
  const p = inst.componentProperties || {};
  const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
  const set = {};
  for (const [nazwa, wartosc] of Object.entries(ustaw)) { const kk = k(nazwa); if (kk) set[kk] = wartosc; }
  if (Object.keys(set).length) inst.setProperties(set);
  stary.remove();
  return { inst, wys };
};
// 02b: pole odpowiedzi
const f02b = sec.children.find(x => x.name === '02b Teraz · odpowiedź');
const reply = f02b.findOne(n => n.name === 'Reply field' && n.type === 'FRAME');
if (reply) {
  const t = reply.findOne(n => n.type === 'TEXT');
  const r = podmien(reply, wMulti, { 'Value': t ? t.characters : 'Napisz odpowiedź', 'Show label': false });
  r.inst.layoutSizingVertical = 'FIXED';
  r.inst.resize(r.inst.width, r.wys);
  log.push('02b Reply field → Text field (Multiline, Focus)');
}
// 02b: cytat
const quote = f02b.findOne(n => n.name === 'Quote' && n.type === 'FRAME');
if (quote && compQ) {
  const teksty = quote.findAll(n => n.type === 'TEXT').map(n => n.characters);
  const r = podmien(quote, compQ, { 'Meta': teksty[0], 'Text': teksty[1], 'Author': teksty[0], 'Body': teksty[1] });
  r.inst.layoutSizingVertical = 'HUG';
  log.push('02b Quote → DS Quote');
}
// 15a: pole nazwy
const f15a = sec.children.find(x => x.name === '15a Plan · nowe zajęcia');
const inp = f15a.findOne(n => n.name === 'Input' && n.type === 'FRAME');
if (inp) {
  const t = inp.findOne(n => n.type === 'TEXT');
  const etykieta = inp.parent.findAll(n => n.type === 'TEXT').find(n => n !== t);
  podmien(inp, wSingle, { 'Value': t ? t.characters : '', 'Label': etykieta ? etykieta.characters : 'Nazwa', 'Show label': false });
  log.push('15a Input → Text field (Single, Empty)');
}
for (const n of ['02b Teraz · odpowiedź','15a Plan · nowe zajęcia']) {
  const f = sec.children.find(x => x.name === n);
  const sh = f.children.find(c => c.name === 'Bottom sheet');
  if (sh) sh.y = 874 - sh.height;
  await shot(f, { scale: 0.7, name: 'vX-' + n.split(' ')[0] });
}
return log;
