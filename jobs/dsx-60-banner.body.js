//# DS: warianty tonalne komponentu Banner + zastosowanie w makietach
const old = findComp('Banner');
let set = old;
if (old && old.type === 'COMPONENT') {
  const doc = dsPage.findOne(n => n.name === 'Doc · Banner');
  const comps = [];
  for (const [tone, bg, fg] of [['Success', 'success-container', 'on-success-container'], ['Warning', 'warning-container', 'warning'], ['Info', 'primary-container', 'on-primary-container']]) {
    const c = old.clone(); c.name = 'Tone=' + tone; c.fills = paint(bg); for (const t of texts(c)) t.fills = paint(fg); comps.push(c); }
  set = variants('Banner', comps, 'Komunikat stanu nad treścią. Success: potwierdzenie i odświeżanie. Warning: nieudane odświeżanie z ostatnimi poprawnymi danymi. Info: informacja kontekstowa. Mówi, co się stało i co dalej; nigdy nie wspomina o prototypie ani symulacji.');
  const k = prop(set, 'Text', 'TEXT', 'Nie udało się odświeżyć. Pokazujemy ostatnie poprawne dane z 18.09.2026.');
  for (const c of set.children) { const t = texts(c)[0]; t.componentPropertyReferences = { characters: k }; }
  if (doc) { doc.appendChild(set); } else { const { b } = await board('Molekuły', 3300); await entry(b, 'Banner', set.description, set); }
  old.remove();
}
// zastosowanie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await page.loadAsync();
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); return true; } catch (e) {} } return false; };
let applied = 0;
for (const i of page.findAllWithCriteria({ types: ['INSTANCE'] }).filter(x => x.name === 'Banner')) {
  const t = texts(i)[0]; if (!t) continue; const warn = /Nie udało się|nieudane|Spróbuj/.test(t.characters);
  try { i.setProperties({ Tone: warn ? 'Warning' : 'Success' }); applied++; } catch (e) {}
}
await figma.setCurrentPageAsync(page);
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('20 '), { name: 'b-20', scale: 0.45 });
return { variants: set.children ? set.children.length : 0, applied };
