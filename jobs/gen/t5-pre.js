//# opis: zrzuty odniesienia przed zmiana toru pierscienia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const cele = ['02f Teraz · frekwencja','02h Frekwencja · szczegóły dnia','16 Plan · tydzień','17 Plan · miesiąc','18 Plan · rok'];
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const p = sek.name === 'Ciemny motyw' ? 'c' : 'j';
  for (const nz of cele) {
    const f = sek.children.find(c => c.name === nz);
    if (!f) { out.push('brak ' + nz); continue; }
    await shot(f, { scale: 1, name: 'PRE-' + p + '-' + nz.split(' ')[0] });
    out.push(nz + '/' + sek.name + ': ' + f.findAll(n => n.type === 'INSTANCE' && n.name === 'Day ring').length + ' pierścieni');
  }
  const i = sek.children.find(c => c.name === '02i Frekwencja · z nieobecnościami');
  await shot(i.findOne(n => n.type === 'FRAME' && n.name === 'Kalendarz'), { scale: 2, name: 'PRE-' + p + '-02i-kal' });
}
return out;
