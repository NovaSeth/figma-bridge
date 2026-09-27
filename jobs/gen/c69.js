//# #69: karty spraw → wiersze listy (kółko = akcja główna, szewron = szczegóły)
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const C = {}; for (const c of ds.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) if (c.parent.type !== 'COMPONENT_SET') C[c.name] = c;
const inst = (n, v) => { const c = C[n]; return (c.type === 'COMPONENT_SET' ? (c.children.find(x => x.name === v) || c.defaultVariant) : c).createInstance(); };
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); return true; } catch (e) {} } return false; };
const getP = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const V = (n, coll) => vars.find(v => v.name === n && v.variableCollectionId === cols.find(c => c.name === coll).id);
const paintVar = v => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)];
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; }; const errors = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) { const coll = s.name === 'Ciemny motyw' ? 'Color Dark' : 'Color';
  for (const f of s.children.filter(n => n.type === 'FRAME')) { try {
    const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
    // kontenery, w których leżą karty spraw
    const holders = [...new Set(main.findAll(x => x.type === 'INSTANCE' && x.name === 'Action card').map(x => x.parent))];
    for (const holder of holders) {
      const cards = holder.children.filter(c => c.type === 'INSTANCE' && c.name === 'Action card');
      if (!cards.length) continue;
      const list = figma.createFrame(); list.name = 'List'; list.layoutMode = 'VERTICAL'; list.itemSpacing = 0; list.primaryAxisSizingMode = 'AUTO'; list.counterAxisSizingMode = 'FIXED'; list.resize(holder.width, 10);
      list.fills = paintVar(V('color/surface', coll)); for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) list.setBoundVariable(c, V('radius/xl', 'Size'));
      list.clipsContent = true;
      holder.insertChild(holder.children.indexOf(cards[0]), list); try { list.layoutSizingHorizontal = 'FILL'; } catch (e) {}
      cards.forEach((card, idx) => {
        const kind = getP(card, 'Kind'); const title = getP(card, 'Title'); const meta = getP(card, 'Meta');
        const chips = card.findAll(x => x.type === 'INSTANCE' && /^Chip( \d)?$/.test(x.name) && x.visible !== false);
        const row = inst('List row', 'Leading=Checkbox, Trailing=Chevron');
        setP(row, 'Title', title); setP(row, 'Show subtitle', !!meta); if (meta) setP(row, 'Subtitle', meta);
        const dst = row.findOne(n => n.name === 'Chips top').children.filter(c => c.type === 'INSTANCE');
        chips.forEach((c, i) => { const d = dst[i]; if (!d) return; const tone = (c.componentProperties['Tone'] || {}).value; try { d.setProperties({ Tone: tone }); } catch (e) {}
          setP(d, 'Label', getP(c, 'Label')); setP(d, 'Show icon', getP(c, 'Show icon')); const ic = getP(c, 'Icon'); if (ic) setP(d, 'Icon', ic); });
        setP(row, 'Show chips top', chips.length > 0); for (let i = 2; i <= dst.length; i++) setP(row, 'Show chip top ' + i, i <= chips.length);
        setP(row, 'Show chips', false);
        if (idx) { const line = figma.createRectangle(); line.name = 'Separator'; line.resize(list.width - 32, 1); line.fills = paintVar(V('color/outline-variant', coll)); list.appendChild(line); try { line.layoutSizingHorizontal = 'FILL'; } catch (e) {} }
        list.appendChild(row); try { row.layoutSizingHorizontal = 'FILL'; } catch (e) {}
        card.remove(); bump('wiersz-' + kind);
      });
      holder.itemSpacing = 0;
    }
    if (holders.length) { const mainC = f.children.find(c => c.name === 'Main Content'); mainC.layoutGrow = 0; mainC.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
      if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); mainC.layoutSizingVertical = 'FILL'; mainC.layoutGrow = 1; }
      const sheet = f.children.find(c => c.name === 'Bottom sheet'); if (sheet) sheet.y = f.height - sheet.height;
      const scrim = f.children.find(c => c.name === 'Scrim'); if (scrim && scrim.type !== 'INSTANCE') scrim.resize(f.width, f.height); }
  } catch (e) { errors.push(f.name.slice(0, 16) + ': ' + (e.message || e)); } } }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('01 '), { name: 'c-69', scale: 0.45 });
return { stat, errors: errors.slice(0, 8) };
