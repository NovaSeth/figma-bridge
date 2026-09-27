//# DS P3.b–c: Button i Chip
const { s, b } = await board('Atomy', 2000);
const link = (set, defs) => { const keys = {}; for (const [name, type, def] of defs) keys[name] = set.addComponentProperty(name, type, def); return keys; };
const out = {};
if (!findComp('Button')) {
  const STYLES = { Primary: ['inverse-surface', 'on-inverse-surface'], Secondary: ['neutral-container', 'on-surface'], Text: [null, 'primary'] };
  const comps = [];
  for (const [style, [bg, fg]] of Object.entries(STYLES)) {
    const c = figma.createComponent(); c.name = 'Style=' + style; c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(120, 44);
    c.setBoundVariable('height', V('size/touch')); c.setBoundVariable('itemSpacing', V('spacing/xs')); for (const p of ['paddingLeft', 'paddingRight']) c.setBoundVariable(p, V('spacing/xl')); radius(c, 'md');
    c.fills = bg ? paint(bg) : [];
    const ic = iconInst('reply', 20, fg); ic.name = 'Icon'; c.appendChild(ic);
    const t = await txt('Zrobione', 'label-lg', fg); t.name = 'Label'; c.appendChild(t);
    comps.push(c);
  }
  const set = variants('Button', comps, 'Przycisk 44 px. Primary: jedna główna akcja w karcie lub arkuszu (czarny, w ciemnym motywie biały). Secondary: akcje poboczne („Szczegóły", „Anuluj"). Text: akcje w tekście („Odśwież teraz"). Etykieta to jedno słowo-czasownik, bez słów „symuluj" czy „prototyp".');
  const k = link(set, [['Label', 'TEXT', 'Zrobione'], ['Ikona', 'BOOLEAN', false], ['Ikona ↔', 'INSTANCE_SWAP', findComp('Icon/reply').id]]);
  for (const c of set.children) { c.findOne(n => n.name === 'Label').componentPropertyReferences = { characters: k['Label'] }; c.findOne(n => n.name === 'Icon').componentPropertyReferences = { visible: k['Ikona'], mainComponent: k['Ikona ↔'] }; }
  await entry(b, 'Button', set.description, set); out.button = set.id;
}
if (!findComp('Chip')) {
  const TONES = { Neutral: ['neutral-container', 'on-surface-variant'], Warning: ['warning-container', 'warning'], Success: ['success-container', 'on-success-container'], Info: ['primary-container', 'on-primary-container'] };
  const comps = [];
  for (const [tone, [bg, fg]] of Object.entries(TONES)) {
    const c = figma.createComponent(); c.name = 'Tone=' + tone; c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(80, 26);
    c.setBoundVariable('itemSpacing', V('spacing/xs')); for (const p of ['paddingLeft', 'paddingRight']) c.setBoundVariable(p, V('spacing/sm')); radius(c, 'sm'); c.fills = paint(bg);
    const lead = iconInst('calendar_month', 16, fg); lead.name = 'Leading icon'; c.appendChild(lead);
    const t = await txt('pon. 21 wrz', 'label-md', fg); t.name = 'Label'; c.appendChild(t);
    const trail = iconInst('error', 16, fg); trail.name = 'Trailing icon'; c.appendChild(trail);
    comps.push(c);
  }
  const set = variants('Chip', comps, 'Tag metadanych (data, źródło, rola, stan). Reguła terminu zadania: po terminie = Warning + ikona końcowa error; termin dziś = Success; termin w przyszłości = Neutral. Info = legenda lekcji. Rola nadawcy („Wychowawczyni") to zawsze chip, nie dopisek w tekście.');
  const k = link(set, [['Label', 'TEXT', 'pon. 21 wrz'], ['Ikona', 'BOOLEAN', true], ['Ikona ↔', 'INSTANCE_SWAP', findComp('Icon/calendar_month').id], ['Ikona końcowa', 'BOOLEAN', false]]);
  for (const c of set.children) { c.findOne(n => n.name === 'Label').componentPropertyReferences = { characters: k['Label'] }; c.findOne(n => n.name === 'Leading icon').componentPropertyReferences = { visible: k['Ikona'], mainComponent: k['Ikona ↔'] }; c.findOne(n => n.name === 'Trailing icon').componentPropertyReferences = { visible: k['Ikona końcowa'] }; }
  await entry(b, 'Chip', set.description, set); out.chip = set.id;
}
fitSection(s, b);
for (const n of ['Button', 'Chip']) await shot(findComp(n), { name: 'ds-' + n.toLowerCase(), scale: 1.5 });
return out;
