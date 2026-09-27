//# Migracja M2e: wiersze list i kanałów na instancje List row / Feed row
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const C = {}; for (const c of ds.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) if (c.parent.type !== 'COMPONENT_SET') C[c.name] = c;
const inst = (n, v) => { const c = C[n]; return (c.type === 'COMPONENT_SET' ? (c.children.find(x => x.name === v) || c.defaultVariant) : c).createInstance(); };
const setP = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) { try { i.setProperties({ [k]: value }); return true; } catch (e) {} } return false; };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const styles = await figma.getLocalTextStylesAsync(); const sName = id => { const s = styles.find(x => x.id === id); return s ? s.name : null; };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const kids = n => ('children' in n ? n.children : []);
const replace = (old, ni) => { const parent = old.parent, idx = parent.children.indexOf(old); parent.insertChild(idx, ni);
  if (parent.layoutMode && parent.layoutMode !== 'NONE') { try { if (old.layoutSizingHorizontal === 'FILL' || old.width >= parent.width - parent.paddingLeft - parent.paddingRight - 1) ni.layoutSizingHorizontal = 'FILL'; } catch (e) {} }
  else { ni.x = old.x; ni.y = old.y; try { ni.resize(old.width, ni.height); } catch (e) {} }
  old.remove(); return ni; };
const chipData = n => n.findAll(x => x.type === 'INSTANCE' && /^Chip/.test(x.name)).map(c => { const k = Object.keys(c.componentProperties); const g = p => { const kk = k.find(x => x.startsWith(p)); return kk ? c.componentProperties[kk].value : undefined; }; return { tone: (c.componentProperties['Tone'] || {}).value || 'Neutral', label: g('Label') || '', icon: !!g('Show icon'), iconId: g('Icon') }; });
const applyChips = (i, data) => { const chips = i.findAll(x => x.type === 'INSTANCE' && /^Chip( \d)?$/.test(x.name)); setP(i, 'Show chips', data.length > 0);
  data.slice(0, chips.length).forEach((d, idx) => { const c = chips[idx]; try { c.setProperties({ Tone: d.tone }); } catch (e) {} setP(c, 'Label', d.label); setP(c, 'Show icon', d.icon); if (d.icon && d.iconId) setP(c, 'Icon', d.iconId); });
  for (let k = 2; k <= chips.length; k++) setP(i, 'Show chip ' + k, k <= data.length); };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; }; const errors = [];
const isInstanceOf = (n, name) => n.type === 'INSTANCE' && n.name === name;
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) { try {
  const main = f.children.find(c => c.name === 'Main Content'); if (!main) continue;
  const inMenu = n => { for (let p = n.parent; p; p = p.parent) if (p.type === 'INSTANCE' || p.name === 'Kid menu') return true; return false; };
  const lists = main.findAll(x => x.type === 'FRAME' && ['List', 'MsgList'].includes(x.name) && !inMenu(x));
  for (const list of lists) {
    for (const row of [...kids(list)]) {
      if (row.type === 'INSTANCE' || row.type === 'TEXT') continue;
      const ts = T(row); if (!ts.length) continue;
      const strike = ts.find(t => t.textDecoration === 'STRIKETHROUGH');
      if (strike) { const i = inst('Completed row'); setP(i, 'Title', strike.characters); replace(row, i); bump('completed'); continue; }
      const title = ts.find(t => ['title/md', 'title/md-read', 'title/sm'].includes(sName(t.textStyleId))) || ts.find(t => t.fontSize >= 16); if (!title) continue;
      const rest = ts.filter(t => t !== title && !/^\d+$/.test(t.characters));
      const when = rest.find(t => sName(t.textStyleId) === 'body/xs' && t.characters.length <= 12);
      const bodies = rest.filter(t => ['body/sm', 'body/md'].includes(sName(t.textStyleId)) && t !== when);
      const value = rest.find(t => ['headline/xs', 'label/lg-strong', 'display/sm'].includes(sName(t.textStyleId)));
      const avatar = row.findAll(n => isInstanceOf(n, 'Avatar'))[0];
      const tile = row.findAll(n => isInstanceOf(n, 'Icon tile'))[0];
      const check = row.findAll(n => isInstanceOf(n, 'Checkbox'))[0];
      const sw = row.findAll(n => isInstanceOf(n, 'Switch'))[0];
      const chev = row.findAll(n => n.name === 'Chevron' || (n.type === 'INSTANCE' && n.name === 'Icon/chevron_right'))[0];
      const chips = chipData(row);
      const preview = bodies.find(t => t.maxLines === 2 || (t.characters.length > 60 && t !== bodies[0]));
      const isFeed = !!avatar || (!!preview && !tile && !check);
      if (isFeed) { const read = sName(title.textStyleId) === 'title/md-read' || !chips.some(c => c.label === 'Nowe');
        const i = inst('Feed row', 'Leading=' + (avatar ? 'Avatar' : 'None') + ', Read=' + (read ? 'True' : 'False'));
        setP(i, 'Title', title.characters); setP(i, 'Show when', !!when); if (when) setP(i, 'When', when.characters);
        const sub = bodies.find(t => t !== preview); setP(i, 'Show subtitle', !!sub); if (sub) setP(i, 'Subtitle', sub.characters);
        setP(i, 'Show preview', !!preview); if (preview) setP(i, 'Preview', preview.characters);
        applyChips(i, chips.filter(c => c.label !== 'Nowe'));
        if (avatar) { const a = i.findOne(x => isInstanceOf(x, 'Avatar')); const k = Object.keys(avatar.componentProperties).find(x => x.startsWith('Initials')); if (a && k) setP(a, 'Initials', avatar.componentProperties[k].value); }
        if (!read) { const cs = i.findAll(x => x.type === 'INSTANCE' && /^Chip 1$/.test(x.name))[0]; if (cs) { try { cs.setProperties({ Tone: 'Info' }); } catch (e) {} setP(cs, 'Label', 'Nowe'); setP(cs, 'Show icon', false); setP(i, 'Show chips', true); } }
        replace(row, i); bump('feed'); continue; }
      const leading = tile ? 'Icon tile' : check ? 'Checkbox' : avatar ? 'Avatar' : 'None';
      const trailing = sw ? 'Switch' : value ? 'Value' : chev ? 'Chevron' : 'None';
      const i = inst('List row', 'Leading=' + leading + ', Trailing=' + trailing);
      setP(i, 'Title', title.characters); const sub = bodies[0]; setP(i, 'Show subtitle', !!sub); if (sub) setP(i, 'Subtitle', sub.characters);
      if (value) setP(i, 'Value', value.characters); applyChips(i, chips);
      if (tile) { const t2 = i.findOne(x => isInstanceOf(x, 'Leading')) || i.findOne(x => isInstanceOf(x, 'Icon tile')); const tone = (tile.componentProperties['Tone'] || {}).value; const ic = (tile.componentProperties[Object.keys(tile.componentProperties).find(x => x.startsWith('Icon'))] || {}).value;
        if (t2) { try { t2.setProperties({ Tone: tone }); } catch (e) {} if (ic) setP(t2, 'Icon', ic); } }
      if (check) { const c2 = i.findOne(x => isInstanceOf(x, 'Leading')); const on = (check.componentProperties['Checked'] || {}).value; if (c2 && on) { try { c2.setProperties({ Checked: on }); } catch (e) {} } }
      if (sw) { const s2 = i.findOne(x => isInstanceOf(x, 'Switch')); const on = (sw.componentProperties['On'] || {}).value; if (s2 && on) { try { s2.setProperties({ On: on }); } catch (e) {} } }
      replace(row, i); bump('row-' + leading + '-' + trailing);
    }
  }
} catch (e) { errors.push(f.name.slice(0, 16) + ': ' + (e.message || e)); }
  progress((fi + 1) / s.children.length, s.name[0] + ' ' + f.name.slice(0, 18)); }
return { stat, errors: errors.slice(0, 12) };
