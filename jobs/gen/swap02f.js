//# opis: kalendarz frekwencji na instancjach z DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const setRing = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Day ring');
const setLeg = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Legend item');
const ring = {}; for (const c of setRing.children) ring[c.name.split('=')[1]] = c;
const leg = {}; for (const c of setLeg.children) leg[c.name.split('=')[1]] = c;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const DANE = { 2:1, 3:1, 4:1, 7:1, 8:1, 9:1, 10:1, 11:1, 14:1, 15:1, 16:1, 17:1 };
const DZIS = 18;
const log = [];
for (const nazwa of ['02f Teraz · frekwencja', '02h Frekwencja · szczegóły dnia']) {
  const f = sec.children.find(x => x.name === nazwa);
  if (!f) continue;
  const kal = f.findOne(n => n.type === 'FRAME' && n.name === 'Kalendarz');
  if (kal) {
    for (const kom of kal.findAll(n => n.type === 'FRAME' && n.name === 'Komórka')) {
      const stary = kom.children[0];
      if (!stary || stary.type === 'INSTANCE') continue;
      const numer = stary.findOne ? stary.findOne(t => t.type === 'TEXT') : null;
      const dzien = numer ? parseInt(numer.characters, 10) : NaN;
      let stan = 'Empty';
      if (!isNaN(dzien)) {
        if (dzien === DZIS) stan = 'Today';
        else if (DANE[dzien]) stan = 'Full';
        else {
          const idx = kom.parent.children.indexOf(kom);
          stan = idx >= 5 ? 'Empty' : 'None';
        }
      }
      const inst = ring[stan].createInstance();
      kom.insertChild(0, inst);
      if (!isNaN(dzien)) {
        const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === 'Day');
        if (k) inst.setProperties({ [k]: String(dzien) });
      } else { inst.visible = false; }
      stary.remove();
      log.push(nazwa + ' / ' + (isNaN(dzien) ? '—' : dzien) + ' → ' + stan);
    }
  }
  const legenda = f.findOne(n => n.type === 'FRAME' && n.name === 'Legenda');
  if (legenda) {
    const pary = [['Success', 'Obecność'], ['Error', 'Nieobecność'], ['Warning', 'Spóźnienie']];
    for (const stary of legenda.children.slice()) {
      if (stary.type === 'INSTANCE') continue;
      const para = pary.find(p => p[1] === stary.name) || pary[0];
      const inst = leg[para[0]].createInstance();
      legenda.insertChild(legenda.children.indexOf(stary), inst);
      const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === 'Label');
      if (k) inst.setProperties({ [k]: para[1] });
      stary.remove();
      log.push(nazwa + ' / legenda ' + para[1]);
    }
  }
  await shot(f, { scale: 0.8, name: 'vU-' + nazwa.split(' ')[0] });
}
return { n: log.length, probka: log.slice(0, 6) };
