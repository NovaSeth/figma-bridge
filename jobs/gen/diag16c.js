//# opis: jak ulozone sa bloki w kolumnie tygodnia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f16 = sec.children.find(x => x.name === '16 Plan · tydzień');
const piatek = f16.findOne(n => /List - Plan, piątek/.test(n.name));
const czwartek = f16.findOne(n => /List - Plan, czwartek/.test(n.name));
return {
  piatek: { layout: piatek.layoutMode, gap: piatek.itemSpacing, h: Math.round(piatek.height), w: Math.round(piatek.width),
    kids: piatek.children.map(c => ({ n: c.name, t: c.type, y: Math.round(c.y), h: Math.round(c.height), abs: c.layoutPositioning,
      props: c.componentProperties ? Object.keys(c.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(c.componentProperties[k].value)).join(' | ') : null })) },
  czwartekKids: czwartek.children.map(c => c.name + '@' + Math.round(c.y))
};
