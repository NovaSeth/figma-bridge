//# opis: gdzie sa instancje danego wariantu
const SZUKAJ = __SZUKAJ__;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sec of page.children.filter(c => c.type === 'SECTION')) {
  for (const f of sec.children.filter(c => c.type === 'FRAME')) {
    for (const i of f.findAll(n => n.type === 'INSTANCE')) {
      const mc = await i.getMainComponentAsync();
      if (!mc) continue;
      const pelna = (mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name + ' / ' : '') + mc.name;
      if (pelna.indexOf(SZUKAJ) >= 0) out.push({ sek: sec.name, ramka: f.name, w: pelna, etykieta: (i.componentProperties.Label || {}).value, sciezka: i.name });
    }
  }
}
return out;
