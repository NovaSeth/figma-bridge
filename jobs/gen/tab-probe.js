//# opis: jak wyglada instancja paska zakladek na ekranie 22
await figma.loadAllPagesAsync();
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
let ramka = null;
for (const s of page.children.filter(c => c.type === 'SECTION')) {
  const f = s.children.find(c => c.type === 'FRAME' && c.name.startsWith('22 '));
  if (f) { ramka = f; break; }
}
if (!ramka) throw new Error('nie ma ekranu 22');
const pasek = ramka.findOne(n => /tab bar/i.test(n.name));
if (!pasek) throw new Error('nie ma paska w ' + ramka.name);
const out = { ekran: ramka.name, pasek: { nazwa: pasek.name, typ: pasek.type, props: pasek.componentProperties || null }, pozycje: [] };
for (const c of ('children' in pasek ? pasek.children : [])) {
  out.pozycje.push({ nazwa: c.name, typ: c.type, props: c.componentProperties || null,
    teksty: ('findAll' in c ? c.findAll(n => n.type === 'TEXT').map(t => t.characters) : []) });
}
return out;
