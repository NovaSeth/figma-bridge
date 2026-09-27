//# opis: ikony w chipach dat i zalacznikow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const out = { chipy: [], teksty: [] };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const chip of f.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name))) {
    const p = chip.componentProperties || {};
    const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    const kI = Object.keys(p).find(x => x.split('#')[0] === 'Icon');
    const kS = Object.keys(p).find(x => x.split('#')[0] === 'Show icon');
    if (!kL) continue;
    const label = String(p[kL].value);
    const ico = chip.findOne(n => n.type === 'INSTANCE' && /^Icon\//.test(n.name));
    if (!/^(pon|wt|śr|czw|pt|sob|nd)\.?$|^Załącznik$|wrz|dziś|Po terminie|Na /.test(label)) continue;
    out.chipy.push({ screen: f.name, label, icoName: ico ? ico.name : null, show: kS ? p[kS].value : null, icoId: kI ? p[kI].value : null });
  }
  for (const t of f.findAll(n => n.type === 'TEXT')) {
    const v = n => n;
    if (/\.…|…\.|\.\.\.\./.test(t.characters)) out.teksty.push({ screen: f.name, id: t.id, v: t.characters.slice(-45) });
    if (/\b\d+\s+zadań\b/.test(t.characters)) out.teksty.push({ screen: f.name, id: t.id, v: t.characters });
  }
}
const uniq = {};
out.chipy = out.chipy.filter(c => { const k = c.screen + c.label + c.icoName; if (uniq[k]) return false; uniq[k] = 1; return true; });
return out;
