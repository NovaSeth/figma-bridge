//# Arkusze: 64% wysokości ekranu (pełny ekran dla 02a i 02b), przyciemnienie na całą ramkę
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); const scrim = f.children.find(c => c.name === 'Scrim');
  if (scrim) { if (scrim.type === 'INSTANCE') { scrim.resize(f.width, f.height); } else scrim.resize(f.width, f.height); scrim.x = 0; scrim.y = 0; }
  if (!sheet) continue;
  const full = /^02[ab]/.test(f.name);
  const target = full ? Math.round(f.height - 52) : Math.round(f.height * 0.64);
  const body = sheet.findOne(n => n.name === 'Body'); if (!body) continue;
  const fixed = sheet.children.filter(c => c !== body).reduce((a, c) => a + c.height, 0);
  const before = Math.round(sheet.height);
  body.layoutSizingVertical = 'FIXED'; body.resize(body.width, Math.max(target - fixed, 120));
  sheet.y = f.height - sheet.height;
  out.push(f.name.slice(0, 22) + ': ' + before + ' → ' + Math.round(sheet.height) + (full ? ' (pełny)' : ' (64%)'));
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
for (const [p, n] of [['02 ', 's-02'], ['02c', 's-02c'], ['02e', 's-02e']]) { const f = get(p); if (f) await shot(f, { name: n, scale: 0.5 }); }
return out;
