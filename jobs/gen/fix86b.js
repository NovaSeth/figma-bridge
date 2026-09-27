//# opis: #86 akcja banera jako przycisk na pelna szerokosc
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const btn = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Button');
const wzor = btn.children.find(c => c.name === 'Style=Primary outline, State=Default');
const banner = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Banner');
const defs = banner.componentPropertyDefinitions;
const kPokaz = Object.keys(defs).find(k => k.split('#')[0] === 'Show action');
const log = [];
for (const v of banner.children) {
  const stary = v.findOne(n => n.name === 'Action');
  if (!stary || stary.type === 'INSTANCE') continue;
  const widoczny = stary.visible;
  const idx = v.children.indexOf(stary);
  const inst = wzor.createInstance();
  inst.name = 'Action';
  v.insertChild(idx, inst);
  inst.layoutSizingHorizontal = 'FILL';
  inst.visible = widoczny;
  inst.isExposedInstance = true;
  inst.componentPropertyReferences = { visible: kPokaz };
  const kL = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === 'Label');
  if (kL) inst.setProperties({ [kL]: 'Spróbuj ponownie' });
  stary.remove();
  v.itemSpacing = 12;
  log.push(v.name);
}
// wlasciwosc tekstowa Action nie ma juz warstwy — usuwam ja z zestawu
const kAkcja = Object.keys(banner.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Action');
if (kAkcja) { try { banner.deleteComponentProperty(kAkcja); log.push('usunięto właściwość Action'); } catch (e) { log.push('Action: ' + e.message); } }
banner.description = 'Komunikat stanu nad treścią, bez zasłaniania ekranu. Ton niesie znaczenie: Warning = dane nieodświeżone, Success = potwierdzenie, Info = informacja. „Show action” pokazuje pod treścią przycisk Primary outline na pełną szerokość — etykietę ustawia się na zagnieżdżonej instancji.';
await shot(banner, { scale: 1, name: 'vAB-banner' });
return log;
