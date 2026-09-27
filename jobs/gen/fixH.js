//# opis: ikony dat, wielokropki, komunikaty bledow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const ikony = {};
for (const n of ds.findAll(x => x.type === 'COMPONENT' && /^Icon\//.test(x.name))) ikony[n.name] = n.id;
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { daty: 0, kropki: [], bledy: [] };
const DATA = /^(pon|wt|śr|czw|pt|sob|nd)\.?$|wrz|paź|lis|gru|sty|lut|mar|kwi|maj|cze|lip|sie|dziś|Po terminie|^Na |^\d{1,2}:\d{2}/i;
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  // 1. chip z datą ma kalendarz, chip z załącznikiem spinacz
  for (const chip of f.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name))) {
    const p = chip.componentProperties || {};
    const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    const kI = Object.keys(p).find(x => x.split('#')[0] === 'Icon');
    if (!kL || !kI) continue;
    const label = String(p[kL].value);
    const chce = label === 'Załącznik' ? ikony['Icon/attach_file'] : DATA.test(label) ? ikony['Icon/calendar_month'] : null;
    if (!chce || String(p[kI].value) === chce) continue;
    chip.setProperties({ [kI]: chce });
    log.daty++;
  }
  // 2. zdublowane kropki na końcu zapowiedzi
  for (const t of f.findAll(n => n.type === 'TEXT' && /[.]{4}|\.…|…\./.test(n.characters))) {
    const stary = t.characters;
    const nowy = stary.replace(/\s*[.]{4,}\s*$/, '…').replace(/\.…$/, '…').replace(/…\.$/, '…');
    if (nowy !== stary) { t.characters = nowy; log.kropki.push({ screen: f.name, na: nowy.slice(-30) }); }
  }
  // 3. komunikaty błędów nie powtarzają podpowiedzi
  const BLEDY = { 'Wybierz odbiorcę.': 'Wskaż, do kogo wysyłasz wiadomość.', 'Wpisz temat.': 'Temat nie może być pusty.' };
  for (const inst of f.findAll(n => n.type === 'INSTANCE' && n.name.indexOf('Text field') >= 0)) {
    const p = inst.componentProperties || {};
    const k = Object.keys(p).find(x => x.split('#')[0] === 'Error text');
    if (!k) continue;
    const v = String(p[k].value);
    if (BLEDY[v]) { inst.setProperties({ [k]: BLEDY[v] }); log.bledy.push({ screen: f.name, z: v, na: BLEDY[v] }); }
  }
}
return log;
