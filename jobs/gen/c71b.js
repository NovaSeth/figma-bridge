//# #71: domknięcie — wiersze z datą po prawej w arkuszach i wątkach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); return true; } catch (e) { return false; } } return false; };
const getP = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
const left = []; let moved = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const row of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Feed row')) {
    if (!getP(row, 'Show when')) continue;
    const when = getP(row, 'When');
    const inInstance = (() => { for (let p = row.parent; p && p !== f; p = p.parent) if (p.type === 'INSTANCE') return true; return false; })();
    const top = row.findOne(n => n.name === 'Chips top'); const dst = top ? top.children.filter(c => c.type === 'INSTANCE') : [];
    if (inInstance || !dst.length) { left.push(f.name.slice(0, 14) + '/' + (inInstance ? 'w instancji' : 'brak slotu')); continue; }
    const shown = getP(row, 'Show chips top') ? dst.filter(c => c.visible !== false).length : 0;
    const old = dst.slice(0, shown).map(c => ({ tone: (c.componentProperties['Tone'] || {}).value, label: getP(c, 'Label'), icon: getP(c, 'Show icon'), iconId: getP(c, 'Icon') }));
    const all = [{ tone: 'Neutral', label: when, icon: true }, ...old].slice(0, dst.length);
    all.forEach((d, i) => { const t = dst[i]; try { t.setProperties({ Tone: d.tone || 'Neutral' }); } catch (e) {} setP(t, 'Label', d.label); setP(t, 'Show icon', !!d.icon); if (d.iconId) setP(t, 'Icon', d.iconId); });
    setP(row, 'Show chips top', true); for (let i = 2; i <= dst.length; i++) setP(row, 'Show chip top ' + i, i <= all.length);
    setP(row, 'Show when', false); moved++;
  } }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('02a'), { name: 'c-71b', scale: 0.5 }); await shot(get('08 '), { name: 'c-71c', scale: 0.5 });
return { moved, left: [...new Set(left)].slice(0, 6) };
