//# #71: szewrony wyśrodkowane, data jako tag nad tytułem (Feed row)
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const feed = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Feed row');
const listRow = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const fixChevron = set => { let n = 0; for (const v of set.children) { const ch = v.findOne(x => x.name === 'Chevron'); if (!ch) continue;
  ch.layoutMode = 'VERTICAL'; ch.primaryAxisAlignItems = 'CENTER'; ch.counterAxisAlignItems = 'CENTER'; ch.primaryAxisSizingMode = 'FIXED';
  try { ch.layoutSizingVertical = 'FILL'; } catch (e) {} ch.layoutSizingHorizontal = 'HUG'; n++; } return n; };
const out = { chevronFeed: fixChevron(feed), chevronList: fixChevron(listRow) };
// domyślnie bez daty po prawej
const k = Object.keys(feed.componentPropertyDefinitions).find(x => x.startsWith('Show when'));
if (k) { feed.editComponentProperty(k, { defaultValue: false }); out.showWhenDefault = false; }
if (!/tag nad tytułem/.test(feed.description)) feed.description += ' Data nie stoi po prawej stronie tytułu: prezentujemy ją jak w całym systemie, czyli jako chip nad tytułem (Show chips top).';
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const setP = (i, n, v) => { const kk = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (kk) { try { i.setProperties({ [kk]: v }); return true; } catch (e) {} } return false; };
const getP = (i, n) => { const kk = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return kk ? i.componentProperties[kk].value : undefined; };
let moved = 0, chev = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const row of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Feed row')) {
    const when = getP(row, 'When');
    if (getP(row, 'Show when') && when) {
      const top = row.findOne(n => n.name === 'Chips top'); const dst = top ? top.children.filter(c => c.type === 'INSTANCE') : [];
      const existing = getP(row, 'Show chips top') ? dst.filter(c => c.visible !== false).length : 0;
      // data wchodzi jako pierwszy chip, reszta przesuwa się dalej
      const labels = dst.map(c => ({ tone: (c.componentProperties['Tone'] || {}).value, label: getP(c, 'Label'), icon: getP(c, 'Show icon'), iconId: getP(c, 'Icon') })).slice(0, existing);
      const all = [{ tone: 'Neutral', label: when, icon: true, iconId: undefined }, ...labels].slice(0, dst.length);
      all.forEach((d, i) => { const t = dst[i]; if (!t) return; try { t.setProperties({ Tone: d.tone || 'Neutral' }); } catch (e) {}
        setP(t, 'Label', d.label); setP(t, 'Show icon', !!d.icon); if (d.iconId) setP(t, 'Icon', d.iconId); });
      setP(row, 'Show chips top', true); for (let i = 2; i <= dst.length; i++) setP(row, 'Show chip top ' + i, i <= all.length);
      setP(row, 'Show when', false); moved++;
    }
    const ch = row.findOne(n => n.name === 'Chevron'); if (ch) { try { ch.layoutSizingVertical = 'FILL'; chev++; } catch (e) {} }
  }
  for (const row of f.findAll(x => x.type === 'INSTANCE' && x.name === 'List row')) { const ch = row.findOne(n => n.name === 'Chevron'); if (ch) { try { ch.layoutSizingVertical = 'FILL'; chev++; } catch (e) {} } }
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('07 '), { name: 'c-71', scale: 0.5 }); await shot(get('02a'), { name: 'c-71b', scale: 0.5 });
return { ...out, moved, chev };
