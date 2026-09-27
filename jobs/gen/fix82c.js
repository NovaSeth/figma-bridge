//# opis: #82 wyrownanie marginesow i akcja Odswiez
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = light.children.find(x => x.name === '02g Teraz · ustawienia');
const main = f.children.find(c => c.name === 'Main Content');
const vars = await figma.variables.getLocalVariablesAsync();
const names = vars.filter(v => v.resolvedType === 'COLOR' && /link|primary|accent|brand|action/i.test(v.name)).map(v => v.name);
const log = [];
// nagłówki i tytuł w jednej linii z treścią wierszy (16 + 16)
for (const c of main.children) {
  if (c.name === 'Section heading') { try { c.paddingLeft = 16; c.paddingRight = 16; } catch (e) { log.push(c.name + ': ' + e.message); } }
  if (c.name === 'Cover top bar') { try { c.paddingLeft = 16; } catch (e) { log.push('top bar: ' + e.message); } }
  if (c.name === 'Foot') { try { c.paddingLeft = 16; c.paddingRight = 16; } catch (e) { log.push('foot: ' + e.message); } }
}
// "Odśwież teraz" ma wyglądać na akcję
const link = vars.find(v => v.name === 'color/link') || vars.find(v => v.name === 'color/primary') || vars.find(v => /accent/i.test(v.name));
let akcja = 'nie znaleziono wiersza';
for (const row of main.findAll(n => n.type === 'INSTANCE' && n.name === 'List row')) {
  const p = row.componentProperties || {};
  const k = Object.keys(p).find(x => x.split('#')[0] === 'Title');
  if (!k || String(p[k].value) !== 'Odśwież teraz') continue;
  const t = row.findOne(n => n.type === 'TEXT' && n.characters === 'Odśwież teraz');
  if (t && link) { t.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }, 'color', link)]; akcja = 'kolor ' + link.name; }
  else akcja = 'brak zmiennej koloru: ' + names.join(', ');
}
await shot(f, { scale: 1, name: 'v82-ustawienia' });
return { log, akcja, kolory: names };
