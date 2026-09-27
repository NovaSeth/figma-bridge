//# opis: Show chip domyslnie wylaczony + demo w Doc KPI card
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const log = [];
const kpi = ds.findOne(n => n.type === 'COMPONENT' && n.name === 'KPI card' && (!n.parent || n.parent.type !== 'COMPONENT_SET'));
const klucz = Object.keys(kpi.componentPropertyDefinitions).find(k => k.split('#')[0] === 'Show chip');
const wrap = kpi.children.find(c => c.name === 'Chip wrap');
wrap.visible = false;
try { kpi.editComponentProperty(klucz, { defaultValue: false }); log.push('default=false'); } catch (e) { log.push('editComponentProperty: ' + e.message); }
log.push('def po: ' + JSON.stringify(kpi.componentPropertyDefinitions[klucz]));
// demo w Doc
const board = ds.children.find(c => c.type === 'SECTION' && c.name === 'Molekuły').children.find(c => c.name === 'Board');
const doc = board.children.find(c => c.name === 'Doc · KPI card');
let demo = doc.children.find(c => c.type === 'INSTANCE' && c.name === 'KPI card · Show chip');
if (!demo) {
  demo = kpi.createInstance();
  demo.name = 'KPI card · Show chip';
  doc.appendChild(demo);
  log.push('dodano demo');
}
const p = demo.componentProperties || {};
const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
demo.setProperties({ [k('Show chip')]: true, [k('Value')]: '81%', [k('Title')]: 'Obecność na 69 z 85 lekcji', [k('Detail')]: '12 nieobecności, 3 spóźnienia, 1 zwolnienie we wrześniu' });
const chipDemo = demo.findOne(n => n.type === 'INSTANCE' && n.name === 'Chip');
if (chipDemo) { const q = chipDemo.componentProperties; const kk = x => Object.keys(q).find(y => y.split('#')[0] === x);
  chipDemo.setProperties({ [kk('Label')]: '3 bez usprawiedliwienia', [kk('Tone')]: 'Error', [kk('Show icon')]: false }); log.push('chip demo ustawiony'); }
// istniejace instancje na ekranach: wymus false
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const f of sek.children.filter(c => c.type === 'FRAME')) {
    for (const inst of f.findAll(n => n.type === 'INSTANCE' && n.name === 'KPI card')) {
      const kk = Object.keys(inst.componentProperties).find(y => y.split('#')[0] === 'Show chip');
      if (kk && inst.componentProperties[kk].value !== false) { inst.setProperties({ [kk]: false }); log.push('wylaczono chip: ' + sek.name + ' / ' + f.name); }
    }
  }
}
await shot(doc, { scale: 2, name: 't3-doc-kpi2' });
const sek = page.children.find(c => c.type === 'SECTION' && c.name === 'Jasny motyw');
await shot(sek.children.find(c => c.name === '02f Teraz · frekwencja'), { scale: 0.7, name: 't3-kontrola-02f' });
return log;
