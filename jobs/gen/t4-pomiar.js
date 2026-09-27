//# opis: pomiar - ile zajmuje stopka 02i w roznych stylach i ile da sie odzyskac na marginesach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const style = {}; (await figma.getLocalTextStylesAsync()).forEach(s => style[s.name] = s);
const opisStylu = n => { const s = style[n]; return s ? n + ' ' + s.fontSize + '/' + (s.lineHeight && s.lineHeight.value ? s.lineHeight.value : 'auto') : n + ' brak'; };
const sek = page.children.find(c => c.type === 'SECTION' && c.name === 'Jasny motyw');
const f = sek.children.find(c => c.name === '02i Frekwencja · z nieobecnościami');
const main = f.children.find(c => c.name === 'Main Content');
const foot = main.children.find(c => c.name === 'Foot');
const t = foot.findOne(n => n.type === 'TEXT');
const leg = main.children.find(c => c.name === 'Legenda');
const out = { style: ['body/sm','body/xs','body/2xs'].map(opisStylu),
  stopkaTeraz: Math.round(foot.height), znakow: t.characters.length,
  stopkiInnych: [] };
for (const nz of ['02f Teraz · frekwencja','02h Frekwencja · szczegóły dnia','02k Frekwencja · rok']) {
  const g = sek.children.find(c => c.name === nz);
  const ft = g.findOne(n => n.type === 'FRAME' && n.name === 'Foot');
  if (!ft) { out.stopkiInnych.push(nz + ': brak'); continue; }
  const tx = ft.findOne(n => n.type === 'TEXT');
  const nazwaStylu = Object.keys(style).find(k => style[k].id === tx.textStyleId) || '?';
  out.stopkiInnych.push(nz + ': ' + nazwaStylu + ', ' + Math.round(ft.height) + ' px, ' + tx.characters.length + ' znaków');
}
// proba: body/xs
const bylo = t.textStyleId;
await t.setTextStyleIdAsync(style['body/xs'].id);
out.stopkaXs = Math.round(foot.height);
await t.setTextStyleIdAsync(bylo);
out.stopkaPowrot = Math.round(foot.height);
// ile da sie odzyskac na marginesach
out.legenda = { h: Math.round(leg.height), padT: leg.paddingTop, padB: leg.paddingBottom };
out.monthBar = (() => { const m = main.children.find(c => c.name === 'Month bar'); return { h: Math.round(m.height), padT: m.paddingTop, padB: m.paddingBottom }; })();
out.mainGap = main.itemSpacing;
out.dzieci = main.children.map(c => c.name + ':' + Math.round(c.height));
const ost = main.children[main.children.length - 1];
out.dolTresci = Math.round(ost.y + ost.height);
return out;
