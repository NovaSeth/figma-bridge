//# Poprawka treści wierszy w arkuszu 02a (inicjały trafiły w podtytuł)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); } catch (e) {} } };
const DATA = [
  { subtitle: 'Pocztówka z wakacji, informacja', preview: 'Proszę na poniedziałek 21 września przynieść pocztówkę z wakacji.' },
  { subtitle: 'Mała Ortografia', preview: 'Proszę Państwa, w załączniku przesyłam zdjęcie ćwiczeń ortograficznych do klasy 1.' },
];
const out = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME' && n.name.startsWith('02a'))) {
  const sheet = f.children.find(c => c.name === 'Bottom sheet'); const list = sheet && sheet.findOne(n => n.type === 'FRAME' && n.name === 'List'); if (!list) continue;
  const rows = list.children.filter(c => c.type === 'INSTANCE' && c.name === 'Feed row');
  rows.forEach((row, i) => { const d = DATA[i]; if (!d) return; setP(row, 'Title', 'Joanna Osęka-Więcławicz'); setP(row, 'Show subtitle', true); setP(row, 'Subtitle', d.subtitle); setP(row, 'Show preview', true); setP(row, 'Preview', d.preview); out.push('02a wiersz ' + (i + 1) + ': ' + d.subtitle); });
  sheet.y = f.height - sheet.height;
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('02a'), { name: 'c-71b', scale: 0.5 });
return out;
