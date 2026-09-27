//# opis: dlaczego Teraz wyglada na aktywne na ekranie Planu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '15 Plan · dzień');
const tabs = f.children.find(c => c.name === 'Tab bar');
const opis = n => {
  const p = n.fills && n.fills !== figma.mixed && n.fills[0];
  const b = p && p.boundVariables && p.boundVariables.color;
  return { n: n.name, t: n.type, vis: n.visible, zm: b ? byId[b.id].name : 'brak',
    rgb: p && p.type === 'SOLID' ? [Math.round(p.color.r*255), Math.round(p.color.g*255), Math.round(p.color.b*255)] : null,
    txt: n.type === 'TEXT' ? n.characters : null };
};
const props = tabs.componentProperties || {};
const poz = tabs.children.map(c => ({ n: c.name, t: c.type,
  props: c.componentProperties ? Object.keys(c.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(c.componentProperties[k].value)).join(',') : null,
  dzieci: c.findAll ? c.findAll(x => x.type === 'TEXT' || x.type === 'VECTOR' || /Pill|Bg/.test(x.name)).map(opis) : null }));
return { props: Object.keys(props).map(k => k.split('#')[0] + '=' + JSON.stringify(props[k].value)), poz: poz.slice(0, 3) };
