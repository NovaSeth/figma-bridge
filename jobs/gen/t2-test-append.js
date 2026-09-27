//# opis: test appendChild klonu do zestawu wariantow
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const log = [];
const proba = async (nazwa, fn) => { try { const r = await fn(); log.push('OK ' + nazwa + (r !== undefined ? ' -> ' + r : '')); return r; } catch (e) { log.push('PAD ' + nazwa + ': ' + (e && e.message ? e.message : e)); return null; } };
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
log.push('set layout=' + set.layoutMode + ' w=' + set.width);
const src = set.children.find(c => c.name === 'Tone=Neutral, Kind=Icon');
const kl = src.clone();
log.push('klon w ' + kl.parent.name + '/' + kl.parent.type);
await proba('rename', () => { kl.name = 'Tone=Neutral, Kind=Value'; return kl.name; });
await proba('appendChild', () => { set.appendChild(kl); return 'rodzic=' + kl.parent.name + '/' + kl.parent.type; });
await proba('odczyt defs', () => JSON.stringify(Object.keys(set.componentPropertyDefinitions)));
await proba('sprzatanie', () => { kl.remove(); return 'ok'; });
return log;
