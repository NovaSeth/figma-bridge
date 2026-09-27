//# opis: gdzie stoja instancje Day ring w stanie Partial, co jest w sekcjach poza ramkami, gdzie Raszyn
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const out = { partial: [], poza: [], raszyn: [], docNaStronie: [] };
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  out.poza.push(sek.name + ': ' + sek.children.filter(c => c.type !== 'FRAME').map(c => c.name + '<' + c.type + '>').join(', ') || (sek.name + ': same ramki'));
  for (const f of sek.children.filter(c => c.type === 'FRAME')) {
    const rings = f.findAll(n => n.type === 'INSTANCE' && n.name === 'Day ring');
    const licz = {};
    for (const r of rings) {
      if (r.visible === false) continue;
      const p = r.componentProperties || {};
      const st = Object.keys(p).find(k => k.split('#')[0] === 'State');
      const tn = Object.keys(p).find(k => k.split('#')[0] === 'Tone');
      const dz = Object.keys(p).find(k => k.split('#')[0] === 'Day');
      const klucz = (st ? p[st].value : '?') + '/' + (tn ? p[tn].value : '—');
      if (!/^Partial/.test(klucz)) continue;
      licz[klucz] = (licz[klucz] || 0) + 1;
      if (klucz === 'Partial/Neutral') out.partial.push(sek.name + ' / ' + f.name + ' / dzień ' + (dz ? p[dz].value : '?'));
    }
    const inne = Object.entries(licz).filter(([k]) => k !== 'Partial/Neutral');
    if (inne.length) out.docNaStronie.push(sek.name + ' / ' + f.name + ': ' + inne.map(([k, v]) => k + '×' + v).join(', '));
    for (const t of f.findAll(n => n.type === 'TEXT' && /Raszyn/.test(n.characters))) out.raszyn.push(sek.name + ' / ' + f.name + ' / "' + t.characters + '"');
    for (const i of f.findAll(n => n.type === 'INSTANCE')) {
      for (const [k, v] of Object.entries(i.componentProperties || {})) {
        if (typeof v.value === 'string' && /Raszyn/.test(v.value)) out.raszyn.push(sek.name + ' / ' + f.name + ' / ' + i.name + ' ' + k.split('#')[0] + '="' + v.value + '"');
      }
    }
  }
}
const sek0 = page.children.find(c => c.type === 'SECTION' && c.name === 'Jasny motyw');
const f02k = sek0.children.find(c => c.name === '02k Frekwencja · rok');
out.ramka02k = { x: Math.round(f02k.x), y: Math.round(f02k.y), w: Math.round(f02k.width), h: Math.round(f02k.height) };
out.sekcja = { x: Math.round(sek0.x), y: Math.round(sek0.y), w: Math.round(sek0.width), h: Math.round(sek0.height) };
return out;
