//# opis: zblizenie na karte Matematyki w 06a
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const f = sek.children.find(c => c.name === '06a Oceny · oceny cyfrowe');
  if (!f) continue;
  const bloki = f.findOne(c => c.name === 'Main Content').children;
  const mat = bloki[3]; // Matematyka
  await shot(mat, { scale: 2.5, name: 't2-06a-detal-' + (sek.name === 'Ciemny motyw' ? 'ciemny' : 'jasny') });
  const lead = mat.findOne(n => n.type === 'INSTANCE' && n.name === 'Leading');
  out.push({ sekcja: sek.name, blok: mat.name, kafel: lead ? { w: lead.width, h: lead.height, props: Object.entries(lead.componentProperties||{}).map(([k,v])=>k.split('#')[0]+'='+v.value).join(', ') } : 'brak' });
}
return out;
