//# opis: audyt tekstow do poprawy
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const hits = { dwaRazyDzis: [], odmiana: [], kropki: [], inicjaly: [] };
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const t of f.findAll(n => n.type === 'TEXT')) {
    const v = t.characters;
    if (/(dziś|Dziś)\s*·\s*dziś/i.test(v)) hits.dwaRazyDzis.push({ screen: f.name, id: t.id, v });
    if (/\b(1|2|3|4)\s+zadań\b/.test(v)) hits.odmiana.push({ screen: f.name, id: t.id, v });
    if (/\.\.\.\.|\.…|…\./.test(v)) hits.kropki.push({ screen: f.name, id: t.id, v: v.slice(-40) });
    if (/^[A-ZĄĆĘŁŃÓŚŹŻ]{2}$/.test(v.trim()) && t.name !== 'Initials' && t.parent && t.parent.name !== 'Avatar') hits.inicjaly.push({ screen: f.name, id: t.id, v, parent: t.parent.name, gp: t.parent.parent && t.parent.parent.name });
  }
}
for (const k of Object.keys(hits)) hits[k + '_n'] = hits[k].length;
hits.dwaRazyDzis = hits.dwaRazyDzis.slice(0, 8);
hits.inicjaly = hits.inicjaly.slice(0, 8);
return hits;
