//# opis: odnajdz i usun osierocony komponent po nieudanym przebiegu
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
const wSecie = set.children.map(c => c.name + ' (' + c.children.length + ' dzieci)');
const sieroty = ds.findAll(n => n.type === 'COMPONENT' && (!n.parent || n.parent.type !== 'COMPONENT_SET'));
const opis = sieroty.map(n => ({ n: n.name, rodzic: n.parent ? n.parent.name + '/' + n.parent.type : 'brak', x: Math.round(n.x), y: Math.round(n.y), dzieci: n.children.length }));
const usuniete = [];
for (const n of sieroty) if (/Kind=Value|Kind=Icon|^Tone=/.test(n.name)) { usuniete.push(n.name + ' z ' + (n.parent ? n.parent.name : '?')); n.remove(); }
return { wSecie, sieroty: opis, usuniete };
