//# opis: padding karty KPI i innych blokow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const out = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const k of f.findAll(n => n.type === 'INSTANCE' && n.name === 'KPI card')) {
    out.push({ screen: f.name, pad: [k.paddingTop, k.paddingRight, k.paddingBottom, k.paddingLeft], w: Math.round(k.width),
      rodzic: k.parent.name, rodzicPad: 'paddingLeft' in k.parent ? [k.parent.paddingTop, k.parent.paddingRight, k.parent.paddingBottom, k.parent.paddingLeft] : null });
  }
  // inne bloki, ktorym mogl zniknac padding
  const main = f.children.find(c => c.name === 'Main Content');
  if (!main) continue;
  for (const c of main.children) {
    if ('paddingLeft' in c && c.paddingLeft === 0 && c.paddingRight === 0 && /margin/.test(c.name)) {
      const dziecko = c.children[0];
      if (dziecko && 'paddingLeft' in dziecko && dziecko.paddingLeft === 0) out.push({ screen: f.name, podejrzany: c.name + ' > ' + dziecko.name });
    }
  }
}
return out.slice(0, 20);
