//# opis: pisownia, cudzyslowy, data oferty, teksty na osi 16
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { pisownia: 0, cudzyslowy: 0, chipy: 0, osie: [] };
const setText = (t, v) => {
  let n = t.parent; const old = t.characters;
  while (n && n.type !== 'PAGE') {
    if (n.type === 'INSTANCE' && n.componentProperties) {
      const k = Object.keys(n.componentProperties).find(x => n.componentProperties[x].type === 'TEXT' && n.componentProperties[x].value === old);
      if (k) { n.setProperties({ [k]: v }); return true; }
    }
    n = n.parent;
  }
  try { t.characters = v; return true; } catch (e) { return false; }
};
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const t of f.findAll(n => n.type === 'TEXT')) {
    const stary = t.characters;
    let nowy = stary.replace(/nie potwierdzony/g, 'niepotwierdzony');
    // każdy „ musi mieć parę ”
    if (nowy.indexOf('„') >= 0 && nowy.indexOf('"') >= 0) nowy = nowy.replace(/„([^„”]*?)"/g, '„$1”');
    nowy = nowy.replace(/"$/, '”');
    if (nowy !== stary) {
      setText(t, nowy);
      if (/niepotwierdzony/.test(nowy) && !/niepotwierdzony/.test(stary)) log.pisownia++;
      if ((nowy.match(/”/g) || []).length > (stary.match(/”/g) || []).length) log.cudzyslowy++;
    }
  }
  // data oferty zgodna z planem piątku
  for (const chip of f.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name))) {
    const p = chip.componentProperties || {};
    const k = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    if (!k) continue;
    const v = String(p[k].value);
    if (v.indexOf('pon. 21 wrz · 17:00') < 0) continue;
    chip.setProperties({ [k]: 'pt. 18 wrz · 17:00' });
    log.chipy++;
  }
  // wszystkie bloki treści na osi 16
  const main = f.children.find(c => c.name === 'Main Content');
  if (!main) continue;
  for (const c of main.children) {
    if (!('paddingLeft' in c)) continue;
    if (c.paddingLeft === 4 || c.paddingLeft === 20) {
      const przed = c.paddingLeft;
      try { c.paddingLeft = 0; c.paddingRight = 0; log.osie.push(f.name + ' / ' + c.name + ' ' + przed + '→0'); } catch (e) {}
    }
  }
}
log.osie = log.osie.slice(0, 10);
return log;
