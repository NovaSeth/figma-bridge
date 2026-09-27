//# opis: etykiety akcji na 15b
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = light.children.find(x => x.name === '15b Plan · szczegóły oferty zajęć');
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const act = sheet.children.find(c => c.name === 'Sheet actions');
const set = { Primary: 'Dodaj do planu', Secondary: 'Pokaż ogłoszenie' };
const out = [];
for (const b of act.findAll(n => n.type === 'INSTANCE' && set[n.name])) {
  const p = b.componentProperties || {};
  const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
  const kI = Object.keys(p).find(x => x.split('#')[0] === 'Show icon');
  const props = {};
  if (kL) props[kL] = set[b.name];
  if (kI) props[kI] = false;
  b.setProperties(props);
  out.push(b.name + ' → ' + set[b.name]);
}
sheet.y = 874 - sheet.height;
await shot(f, { scale: 1, name: 'v77-15b' });
return out;
