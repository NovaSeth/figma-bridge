//# opis: #89/#90 ikona kalendarza w tagach poza siatka kalendarza
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const ikony = {};
for (const n of ds.findAll(x => x.type === 'COMPONENT' && /^Icon\//.test(x.name))) ikony[n.name] = n.id;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const DATA = /^(pon|wt|śr|czw|pt|sob|nd)\.?\b|wrz|paź|lis|gru|sty|lut|mar|kwi|maj|cze|lip|sie|^dziś|^Po terminie|^Na |^\d{1,2}:\d{2}$/i;
const wSiatce = n => { let k = n.parent; while (k) { if (/MonthGrid|TimeGrid|YearGrid|Rok 2026|Kalendarz|WeekGrid/.test(k.name)) return true; k = k.parent; } return false; };
const log = { wlaczone: [], wylaczone: [] };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const chip of f.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name))) {
    const p = chip.componentProperties || {};
    const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    const kS = Object.keys(p).find(x => x.split('#')[0] === 'Show icon');
    const kI = Object.keys(p).find(x => x.split('#')[0] === 'Icon');
    const kR = Object.keys(p).find(x => x.split('#')[0] === 'Size');
    if (!kL || !kS) continue;
    const label = String(p[kL].value);
    const kompakt = kR && String(p[kR].value) === 'Compact';
    const jestData = DATA.test(label);
    const wKalendarzu = kompakt || wSiatce(chip);
    if (jestData && !wKalendarzu && p[kS].value !== true) {
      const set = { [kS]: true };
      if (kI && ikony['Icon/calendar_month']) set[kI] = ikony['Icon/calendar_month'];
      chip.setProperties(set);
      log.wlaczone.push(f.name + ' / ' + label);
    }
    if (wKalendarzu && p[kS].value === true) {
      chip.setProperties({ [kS]: false });
      log.wylaczone.push(f.name + ' / ' + label);
    }
  }
}
return { wlaczone: log.wlaczone.length, wylaczone: log.wylaczone.length, probkaW: log.wlaczone.slice(0, 8), probkaX: log.wylaczone.slice(0, 8) };
