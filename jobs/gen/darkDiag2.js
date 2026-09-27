//# opis: skad jasne tlo w ciemnym motywie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });
const sek = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
const f = sek.children.find(x => x.name === '07 Wiadomości · odebrane');
const opis = n => {
  const p = n.fills && n.fills !== figma.mixed && n.fills[0];
  const b = p && p.boundVariables && p.boundVariables.color;
  const v = b ? byId[b.id] : null;
  return { n: n.name, t: n.type, rgb: p && p.type === 'SOLID' ? [Math.round(p.color.r*255), Math.round(p.color.g*255), Math.round(p.color.b*255)] : (p ? p.type : 'brak'),
    zm: v ? v.name : 'brak', kol: v ? kolById[v.variableCollectionId].name : '-' };
};
return { ramka: opis(f), sekcja: { n: sek.name, rgb: sek.fills && sek.fills[0] && sek.fills[0].type === 'SOLID' ? [Math.round(sek.fills[0].color.r*255), Math.round(sek.fills[0].color.g*255), Math.round(sek.fills[0].color.b*255)] : 'brak' },
  dzieci: f.children.map(opis) };
