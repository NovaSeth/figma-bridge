//# opis: List row - nowa wartosc osi Trailing=Chip (stan wiersza w prawej kolumnie)
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold','Extra Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const chipSet = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
const log = [];
// refy gina przy clone() - zbieramy je po sciezce i odtwarzamy
const zbierzRefy = (n) => { const out = []; const walk = (x, p) => {
  if (x.componentPropertyReferences) { try { out.push([p.join('/'), JSON.parse(JSON.stringify(x.componentPropertyReferences))]); } catch (e) {} }
  if ('children' in x) x.children.forEach((c, i) => walk(c, p.concat(i))); }; walk(n, []); return out; };
const przywrocRefy = (n, refy) => { const wg = new Map(refy); let ile = 0; const walk = (x, p) => {
  const k = p.join('/'); if (wg.has(k)) { try { x.componentPropertyReferences = wg.get(k); ile++; } catch (e) {} }
  if ('children' in x) x.children.forEach((c, i) => walk(c, p.concat(i))); }; walk(n, []); return ile; };
for (const lead of ['None', 'Icon tile', 'Avatar', 'Checkbox']) {
  const nazwa = 'Leading=' + lead + ', Trailing=Chip';
  const juz = set.children.find(c => c.name === nazwa);
  if (juz && juz.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip')) { log.push('jest: ' + nazwa); continue; }
  if (juz) juz.remove();
  const src = set.children.find(c => c.name === 'Leading=' + lead + ', Trailing=None');
  const refy = zbierzRefy(src);
  const kl = src.clone();
  kl.name = nazwa;
  set.appendChild(kl);
  const odtworzone = przywrocRefy(kl, refy);
  // prawa kolumna: chip wysrodkowany w pionie, wiersz nigdzie nie prowadzi wiec bez szewrona
  const tr = figma.createFrame();
  tr.name = 'Trailing';
  tr.layoutMode = 'VERTICAL';
  tr.itemSpacing = 0;
  tr.primaryAxisAlignItems = 'CENTER';
  tr.counterAxisAlignItems = 'MAX';
  tr.fills = [];
  kl.appendChild(tr);
  tr.layoutSizingHorizontal = 'HUG';
  tr.layoutSizingVertical = 'FILL';
  const chip = chipSet.children.find(c => c.name === 'Tone=Success, Size=Default').createInstance();
  chip.name = 'Chip';
  tr.appendChild(chip);
  const p = chip.componentProperties || {};
  const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
  chip.setProperties({ [k('Label')]: 'Obecność', [k('Show icon')]: false });
  chip.isExposedInstance = true;
  kl.counterAxisAlignItems = 'CENTER';   // kafel, tytul i chip na jednej osi
  log.push('dodano ' + nazwa + ' (odtworzonych referencji: ' + odtworzone + ')');
}
// kolejnosc: Trailing rosnaco w kazdej grupie Leading
const OS = [];
for (const lead of ['None', 'Icon tile', 'Avatar', 'Checkbox'])
  for (const tr of ['None', 'Chevron', 'Value', 'Chip', 'Switch']) OS.push('Leading=' + lead + ', Trailing=' + tr);
OS.forEach((nz, i) => { const c = set.children.find(x => x.name === nz); if (c) set.insertChild(i, c); });
const OPIS = 'Wiersz listy w karcie (iOS inset grouped). Leading: brak, kafel ikony (Kind=Value niesie ocenę albo numer lekcji), awatar, kółko zadania. Trailing: brak, szewron, wartość z szewronem, chip stanu, przełącznik. Szewron zawsze wyśrodkowany w pionie i tylko gdy wiersz dokądś prowadzi. Data to chip pod tekstem, nie dopisek przy tytule. Gdzie stoi chip: nad tytułem (Show chips top), gdy niesie termin, źródło albo nowość i ma się czytać przed nazwą — „Archiwum", „Nowe", „pt. 11 wrz"; po prawej (Trailing=Chip), gdy niesie STAN tej pozycji w liście jednorodnej, a wiersz nigdzie nie prowadzi — „Obecność", „Spóźnienie", „Nieobecność" lekcja po lekcji. Reguła jest mierzalna: chip nad tytułem podnosi wiersz o 33 px, więc ośmiowierszowa lista rośnie o ćwierć kadru i traci prawą kolumnę do skanowania; chip po prawej zostawia wiersz na 56 px i układa stany w jedną pionową kolumnę. Kwalifikator stanu („Usprawiedliwiona", „Bez usprawiedliwienia") idzie w podtytuł, nie w drugi odcień chipa — dla rodzica to różnica między „wiem o tym" a „mam coś do zrobienia" i nie wolno jej zostawiać samemu kolorowi. Warianty Trailing=Chip mają treść wyśrodkowaną w pionie, bo kafel 32 px, jednowierszowy tytuł i chip 26 px inaczej stoją na trzech różnych liniach. Wzorzec sprawy do załatwienia: kółko po lewej to akcja główna i wskaźnik stanu (Material 3), tap w wiersz otwiera arkusz ze szczegółami, szewron po prawej to jedyna zapowiedź przejścia.';
set.description = OPIS;
for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
  const board = sek.children.find(c => c.name === 'Board');
  if (!board) continue;
  const doc = board.children.find(c => c.name === 'Doc · List row');
  if (!doc) continue;
  const t = doc.children.filter(c => c.type === 'TEXT');
  if (t.length >= 2) { t[1].characters = OPIS; t[1].name = OPIS.slice(0, 60); log.push('Doc · List row zaktualizowany'); }
  await shot(doc, { scale: 1, name: 't3-doc-list-row' });
  break;
}
return { log, warianty: set.children.map(c => c.name), liczba: set.children.length };
