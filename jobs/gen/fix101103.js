//# opis: #101 Wyslij do prawej, #103 licznik nieprzeczytanych
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.filter(c => c.type === 'SECTION');
const log = { wyslij: [], licznik: [] };
for (const sek of sec) {
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    // 1. akcja główna formularza wyrównana do prawej
    for (const b of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Button')) {
      const p = b.componentProperties || {};
      const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
      if (!kL || String(p[kL].value) !== 'Wyślij') continue;
      const rodzic = b.parent;
      if (!rodzic.layoutMode || rodzic.layoutMode === 'NONE') continue;
      if (rodzic.children.filter(c => c.type === 'INSTANCE').length > 1) continue; // para przycisków zostaje 50/50
      if (rodzic.layoutMode === 'VERTICAL') { if (rodzic.counterAxisAlignItems === 'MAX') continue; rodzic.counterAxisAlignItems = 'MAX'; }
      else { if (rodzic.primaryAxisAlignItems === 'MAX') continue; rodzic.primaryAxisAlignItems = 'MAX'; }
      log.wyslij.push(sek.name + ' / ' + f.name);
    }
    // 2. plakietka nieprzeczytanych na zakładce Wiadomości
    const tabs = f.children.find(c => c.name === 'Tab bar');
    if (!tabs) continue;
    const nieprzeczytane = f.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name))
      .filter(c => { const p = c.componentProperties || {}; const k = Object.keys(p).find(x => x.split('#')[0] === 'Label'); return k && String(p[k].value) === 'Nowe'; }).length;
    const zak = tabs.children.find(c => c.name === 'Tab Wiadomości');
    if (!zak) continue;
    const p = zak.componentProperties || {};
    const kS = Object.keys(p).find(x => x.split('#')[0] === 'Show badge');
    if (!kS) continue;
    const chce = nieprzeczytane > 0;
    if (p[kS].value === chce) continue;
    zak.setProperties({ [kS]: chce });
    if (chce) {
      const licz = zak.findOne(n => n.type === 'TEXT' && /^\d+$/.test(n.characters));
      if (licz) { try { licz.characters = String(nieprzeczytane); } catch (e) {} }
    }
    log.licznik.push(sek.name + ' / ' + f.name + ': ' + nieprzeczytane);
  }
}
return log;
