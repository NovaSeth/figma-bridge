//# opis: klonowane warianty odzyskuja powiazania wlasciwosci
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const napraw = (nazwaSetu, mapa) => {
  const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === nazwaSetu);
  if (!set) return { brak: nazwaSetu };
  const defs = set.componentPropertyDefinitions;
  const klucz = pre => Object.keys(defs).find(k => k.split('#')[0] === pre);
  const log = [];
  for (const v of set.children) {
    for (const [nazwaWarstwy, pola] of Object.entries(mapa)) {
      const w = v.findOne(n => n.name === nazwaWarstwy);
      if (!w) continue;
      const ref = Object.assign({}, w.componentPropertyReferences || {});
      let zmiana = false;
      for (const [cecha, prop] of Object.entries(pola)) {
        const k = klucz(prop);
        if (k && ref[cecha] !== k) { ref[cecha] = k; zmiana = true; }
      }
      if (zmiana) { w.componentPropertyReferences = ref; log.push(v.name + ' / ' + nazwaWarstwy); }
    }
  }
  return { set: nazwaSetu, naprawione: log.length, probka: log.slice(0, 6) };
};
const a = napraw('Chip', { 'Label': { characters: 'Label' }, 'Leading icon': { visible: 'Show icon', mainComponent: 'Icon' } });
const b = napraw('Calendar day', { 'Day': { characters: 'Day' } });
const c = napraw('Day ring', { 'Day': { characters: 'Day' } });
const d = napraw('Banner', { 'Text': { characters: 'Text' }, 'Action': { characters: 'Action', visible: 'Show action' } });
return { a, b, c, d };
