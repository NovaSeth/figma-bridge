//# opis: #77 nowy ekran 15b arkusz szczegolow oferty
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const find = n => light.children.find(f => f.name === n);
if (find('15b Plan · szczegóły oferty zajęć')) { const old = find('15b Plan · szczegóły oferty zajęć'); old.remove(); }
const src = find('02c Teraz · szczegóły ogłoszenia');
const plan = find('15 Plan · dzień');
const withActions = find('02 Teraz · szczegóły sprawy (arkusz)');
const a15 = find('15a Plan · nowe zajęcia');
progress(0.1, 'klonuję');
const f = src.clone();
f.name = '15b Plan · szczegóły oferty zajęć';
light.appendChild(f);
f.x = a15.x + 520; f.y = a15.y;
// tło: dzień z Planu zamiast Teraz
const oldMain = f.children.find(c => c.name === 'Main Content');
const oldTabs = f.children.find(c => c.name === 'Tab bar');
const idxMain = f.children.indexOf(oldMain);
const newMain = plan.children.find(c => c.name === 'Main Content').clone();
f.insertChild(idxMain, newMain);
oldMain.remove();
newMain.layoutSizingHorizontal = 'FILL';
newMain.layoutSizingVertical = 'FILL';
newMain.layoutGrow = 1;
if (oldTabs) { const idxT = f.children.indexOf(oldTabs); const newTabs = plan.children.find(c => c.name === 'Tab bar').clone(); f.insertChild(idxT, newTabs); oldTabs.remove(); newTabs.layoutSizingHorizontal = 'FILL'; }
progress(0.5, 'treść arkusza');
// treść arkusza
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const body = sheet.children.find(c => c.name === 'Body');
const chips = body.children.find(c => c.name === 'Container');
const chipLabels = ['Oferta', 'pon. 21 wrz · 17:00'];
chips.children.forEach((c, i) => {
  if (i >= chipLabels.length) { c.visible = false; return; }
  c.visible = true;
  const k = c.componentProperties && Object.keys(c.componentProperties).find(x => x.split('#')[0] === 'Label');
  const ic = c.componentProperties && Object.keys(c.componentProperties).find(x => x.split('#')[0] === 'Show icon');
  const set = {}; if (k) set[k] = chipLabels[i]; if (ic) set[ic] = i === 1;
  if (Object.keys(set).length) c.setProperties(set);
});
const texts = body.children.filter(c => c.type === 'TEXT');
const TITLE = 'Zbiórka próbna: Gromada Zuchowa „Promienne Orły"';
const META = 'Z ogłoszenia „ZHP w naszej szkole" · A. Sapa';
const CONTENT = 'Klasy 1–3. Spotykamy się przed szkolną aulą o 17:00.\n\nNie trzeba się wcześniej zapisywać ani niczego umieć — wystarczy przyjść, wziąć dobry humor i buty na zmianę.\n\nTo oferta z ogłoszenia, nie potwierdzony zapis Julii. Nie wliczamy jej do planu.';
if (texts[0]) { texts[0].characters = TITLE; texts[0].name = TITLE; }
if (texts[1]) { texts[1].characters = META; texts[1].name = META; }
if (texts[2]) { texts[2].characters = CONTENT; texts[2].name = 'Treść oferty'; }
for (let i = 3; i < texts.length; i++) texts[i].visible = false;
// akcje na dole arkusza
const actSrc = withActions.children.find(c => c.name === 'Bottom sheet').children.find(c => c.name === 'Sheet actions');
if (actSrc && !sheet.children.find(c => c.name === 'Sheet actions')) {
  const act = actSrc.clone();
  sheet.appendChild(act);
  act.layoutSizingHorizontal = 'FILL';
  const btns = act.findAll(n => n.type === 'INSTANCE' && n.name === 'Button');
  const labels = ['Dodaj do planu', 'Pokaż ogłoszenie'];
  btns.forEach((b, i) => {
    if (i >= labels.length) return;
    const k = b.componentProperties && Object.keys(b.componentProperties).find(x => x.split('#')[0] === 'Label');
    if (k) b.setProperties({ [k]: labels[i] });
  });
}
progress(0.9, 'dopasowanie');
// arkusz przyklejony do dołu, ekran na wysokość urządzenia
f.primaryAxisSizingMode = 'FIXED';
f.resize(402, 874);
f.clipsContent = true;
const scrim = f.children.find(c => c.name === 'Scrim');
if (scrim) { scrim.x = 0; scrim.y = 0; scrim.resize(402, 874); }
sheet.y = 874 - sheet.height;
await shot(f, { scale: 1, name: 'v77-15b' });
return { name: f.name, x: Math.round(f.x), y: Math.round(f.y), h: Math.round(f.height), sheetH: Math.round(sheet.height), kids: f.children.map(c => c.name) };
