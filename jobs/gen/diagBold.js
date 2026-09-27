//# opis: naglowek dni w widoku tygodnia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '16 Plan · tydzień');
const naglowki = f.findAll(n => /^Button - (Poniedziałek|Wtorek|Środa|Czwartek|Piątek)/.test(n.name));
return naglowki.map(n => ({ n: n.name.slice(0, 40), w: Math.round(n.width), h: Math.round(n.height),
  kids: n.children.map(c => ({ n: c.name, t: c.type, w: Math.round(c.width), h: Math.round(c.height),
    fill: c.fills && c.fills !== figma.mixed && c.fills[0] && c.fills[0].type === 'SOLID' ? [Math.round(c.fills[0].color.r*255),Math.round(c.fills[0].color.g*255),Math.round(c.fills[0].color.b*255)] : 'brak',
    txt: c.type === 'TEXT' ? c.characters : (c.children ? c.children.map(k => k.type === 'TEXT' ? k.characters : k.name).join(',') : null) })) }));
