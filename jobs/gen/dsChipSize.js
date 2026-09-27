//# opis: Chip dostaje rozmiar Compact zamiast osobnego Calendar chip
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
const log = { przed: set.children.map(c => c.name) };
// 1. istniejące warianty dostają jawny rozmiar
for (const c of set.children) {
  if (/Size=/.test(c.name)) continue;
  c.name = c.name + ', Size=Default';
}
// 2. wariant kompaktowy dla każdego tonu
const bazowe = set.children.filter(c => /Size=Default/.test(c.name));
for (const b of bazowe) {
  const ton = b.name.match(/Tone=([^,]+)/)[1];
  if (set.children.find(c => c.name === 'Tone=' + ton + ', Size=Compact')) continue;
  const k = b.clone();
  k.name = 'Tone=' + ton + ', Size=Compact';
  set.appendChild(k);
  k.paddingLeft = 2; k.paddingRight = 2; k.paddingTop = 0; k.paddingBottom = 0;
  k.cornerRadius = 4;
  const ikona = k.findOne(n => n.type === 'INSTANCE' && /^Icon\//.test(n.name));
  if (ikona && ikona.parent === k) ikona.visible = false;
  const t = k.findOne(n => n.type === 'TEXT');
  if (t && S['calendar/chip']) await t.setTextStyleIdAsync(S['calendar/chip'].id);
  if (t) { t.textAutoResize = 'HEIGHT'; t.maxLines = 1; t.textTruncation = 'ENDING'; }
  k.layoutSizingVertical = 'HUG';
  k.resize(53, k.height);
}
// porządek na kanwie
let x = 0, y = 0;
for (const c of set.children) { c.x = x; c.y = y; x += c.width + 16; if (x > 500) { x = 0; y += 60; } }
set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
set.description = 'Etykieta stanu lub kategorii. Size=Default w treści ekranu, Size=Compact w komórkach kalendarza. Ton odpowiada znaczeniu: Info = lekcje, Warning = zadania i terminy, Success = potwierdzone i własne, Neutral = pozostałe.';
log.po = set.children.map(c => c.name);
log.wysokosci = set.children.map(c => c.name + ':' + Math.round(c.height));
return log;
