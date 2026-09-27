//# opis: zrzuty kontrolne po zmianie toru pierscienia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const cele = ['02f Teraz · frekwencja','02h Frekwencja · szczegóły dnia','16 Plan · tydzień','17 Plan · miesiąc','18 Plan · rok'];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const p = sek.name === 'Ciemny motyw' ? 'c' : 'j';
  for (const nz of cele) {
    const f = sek.children.find(c => c.name === nz);
    if (f) await shot(f, { scale: 1, name: 'POST-' + p + '-' + nz.split(' ')[0] });
  }
  const i = sek.children.find(c => c.name === '02i Frekwencja · z nieobecnościami');
  await shot(i.findOne(n => n.type === 'FRAME' && n.name === 'Kalendarz'), { scale: 2, name: 'POST-' + p + '-02i-kal' });
}
return 'ok';
