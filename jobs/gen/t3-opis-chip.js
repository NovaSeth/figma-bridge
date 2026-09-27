//# opis: opis komponentu Chip - ton Error i tony frekwencji byly nieopisane
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const OPIS = 'Tag metadanych (data, źródło, rola, stan). Size=Default w treści ekranu, Size=Compact wyłącznie w komórkach kalendarza — na zwykłej liście Compact jest błędem. Reguła terminu zadania: po terminie = Warning; termin dziś = Success; termin w przyszłości = Neutral. Info = legenda lekcji i „Nowe". Rola nadawcy („Wychowawczyni") to zawsze chip, nie dopisek w tekście. Frekwencja używa czterech tonów i tylko tych: Success = obecność, Warning = spóźnienie, Error = nieobecność, Neutral = zwolnienie; ta sama czwórka stoi w legendzie kalendarza, w wierszach arkusza dnia i w tonach pierścienia Day ring, więc kolor znaczy wszędzie to samo. Error niesie też liczbę, która wymaga od rodzica działania („3 bez usprawiedliwienia") — na karcie KPI i w wierszu miesiąca. Ton nazywa stan, nigdy nie ocenia dziecka.';
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
set.description = OPIS;
const log = ['opis Chip ustawiony'];
for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
  const board = sek.children.find(c => c.name === 'Board');
  if (!board) continue;
  const doc = board.children.find(c => c.name === 'Doc · Chip');
  if (!doc) continue;
  const t = doc.children.filter(c => c.type === 'TEXT');
  if (t.length >= 2) { t[1].characters = OPIS; t[1].name = OPIS.slice(0, 60); log.push('Doc · Chip zaktualizowany'); }
  break;
}
return log;
