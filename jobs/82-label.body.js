//# #39: „Pokaż pozostałe ogłoszenia" bez słowa „szkolne"
let n = 0;
for (const { f } of screens()) for (const t of texts(f).filter(t => t.characters.startsWith('Pokaż pozostałe ogłoszenia szkolne'))) { await setText(t, t.characters.replace('ogłoszenia szkolne', 'ogłoszenia')); n++; }
return { changed: n };
