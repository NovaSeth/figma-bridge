//# #41: Ustawienia i Frekwencja jako ekrany przykrywające, tylko z „X"
const T = THEMES['Jasny motyw']; const MI = { family: 'Material Icons', style: 'Regular' }; await figma.loadFontAsync(MI);
const done = [];
for (const prefix of ['02f', '02g']) {
  const f = sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(prefix)); if (!f) continue;
  if (f.findOne(n => n.name === 'Top bar')) { done.push(prefix + ': już jest'); continue; }
  const header = f.children.find(c => c.name === 'Header'); if (header) header.remove();
  const main = f.children.find(c => c.name === 'Main Content');
  const titleWrap = main.children.find(c => c.name === 'Title'); const titleText = titleWrap ? texts(titleWrap)[0].characters : (prefix === '02g' ? 'Ustawienia' : 'Frekwencja');
  const back = main.children[0]; if (back && back !== titleWrap && texts(back).some(t => t.characters === 'Teraz')) back.remove();
  if (titleWrap) titleWrap.remove();
  const bar = al('Top bar', 'HORIZONTAL', { primaryAxisAlignItems: 'SPACE_BETWEEN', counterAxisAlignItems: 'CENTER', paddingTop: 14, paddingBottom: 10, paddingLeft: 4 });
  bar.appendChild(mk(titleText, 'Extra Bold', 28, T.ink, 110));
  const x = al('Button - Zamknij', 'HORIZONTAL', { cornerRadius: 22, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); x.primaryAxisSizingMode = 'FIXED'; x.counterAxisSizingMode = 'FIXED'; x.resize(44, 44); x.fills = solid(T.chip);
  const g = figma.createText(); g.fontName = MI; g.fontSize = 24; g.lineHeight = { unit: 'PIXELS', value: 24 }; g.characters = 'close'; g.name = 'close'; g.fills = solid(T.ink); x.appendChild(g);
  bar.appendChild(x);
  main.insertChild(0, bar); bar.layoutSizingHorizontal = 'FILL';
  main.paddingTop = 8;
  main.layoutGrow = 0; main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
  if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1; }
  done.push(prefix + ': ok');
}
relayout();
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('02g'), { name: 'v-02g', scale: 0.5 });
await shot(get('02f'), { name: 'v-02f', scale: 0.4 });
return done;
