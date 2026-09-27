//# Migracja M1: wiązanie kolorów, typografii, promieni i odstępów w makietach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(), vars = await figma.variables.getLocalVariablesAsync();
const colId = n => cols.find(c => c.name === n).id;
const V = (name, coll) => vars.find(v => v.name === name && v.variableCollectionId === colId(coll || 'Size'));
const byId = Object.fromEntries(vars.map(v => [v.id, v]));
const resolve = v => { let val = v.valuesByMode[Object.keys(v.valuesByMode)[0]]; while (val && val.type === 'VARIABLE_ALIAS') { v = byId[val.id]; val = v.valuesByMode[Object.keys(v.valuesByMode)[0]]; } return val; };
const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
// hex → nazwa tokenu (z rozstrzyganiem po kontekście)
const mapFor = coll => { const m = {}; for (const v of vars.filter(x => x.variableCollectionId === colId(coll) && x.name.startsWith('color/'))) { const val = resolve(v); if (!val || val.r == null) continue; const key = hex(val) + (val.a != null && val.a < 1 ? '@' + Math.round(val.a * 100) : ''); (m[key] = m[key] || []).push(v.name.slice(6)); } return m; };
const MAPS = { 'Jasny motyw': mapFor('Color'), 'Ciemny motyw': mapFor('Color Dark') };
const COLL = { 'Jasny motyw': 'Color', 'Ciemny motyw': 'Color Dark' };
const ON_OF = { 'inverse-surface': 'on-inverse-surface', badge: 'on-badge', primary: 'on-primary', success: 'on-success', 'warning-strong': 'on-primary', 'primary-container': 'on-primary-container', 'success-container': 'on-success-container', 'warning-container': 'warning', surface: 'on-surface', background: 'on-surface', 'surface-bar': 'on-surface-variant', 'neutral-container': 'on-surface-variant' };
const PREF = { text: ['on-surface', 'on-surface-variant', 'on-primary-container', 'summary-secondary', 'warning', 'on-success-container', 'success', 'primary', 'error', 'on-primary', 'on-badge', 'on-inverse-surface', 'on-success'], fill: ['surface', 'background', 'surface-bar', 'neutral-container', 'primary-container', 'inverse-surface', 'outline-variant', 'warning-container', 'success-container', 'badge', 'success', 'primary', 'warning-strong', 'outline', 'scrim', 'summary-track', 'disabled-container'], stroke: ['outline-variant', 'outline', 'error', 'focus', 'on-surface', 'primary'] };
const ancestorToken = (n, map) => { for (let p = n.parent; p; p = p.parent) { const f = Array.isArray(p.fills) && p.fills.find(x => x.type === 'SOLID' && x.visible !== false); if (f) { const key = hex(f.color) + (f.opacity != null && f.opacity < 1 ? '@' + Math.round(f.opacity * 100) : ''); const c = map[key]; if (c) return (PREF.fill.find(t => c.includes(t)) || c[0]); } } return null; };
const pickToken = (kind, key, node, map) => { const cands = map[key]; if (!cands) return null; if (cands.length === 1) return cands[0];
  if (kind === 'text' || kind === 'icon') { const anc = ancestorToken(node, map); const on = anc && ON_OF[anc]; if (on && cands.includes(on)) return on; }
  return PREF[kind === 'icon' ? 'text' : kind].find(t => cands.includes(t)) || cands[0]; };
// style tekstu
const styles = await figma.getLocalTextStylesAsync();
const pickStyle = t => { const cand = styles.filter(s => s.fontName.style === t.fontName.style && Math.abs(s.fontSize - t.fontSize) < 0.6); if (!cand.length) return null; const lh = t.lineHeight && t.lineHeight.unit === 'PERCENT' ? t.lineHeight.value : t.lineHeight && t.lineHeight.unit === 'PIXELS' ? t.lineHeight.value / t.fontSize * 100 : null; if (lh == null) return cand[0]; const best = cand.map(s => ({ s, d: Math.abs(s.lineHeight.value - lh) })).sort((a, b) => a.d - b.d)[0]; return best.d <= 6 ? best.s : null; };
const SPACING = vars.filter(v => v.name.startsWith('spacing/')).map(v => ({ v, n: resolve(v) })).sort((a, b) => a.n - b.n);
const RADIUS = vars.filter(v => v.name.startsWith('radius/')).map(v => ({ v, n: resolve(v) }));
const snapSpace = val => { const b = SPACING.map(x => ({ ...x, d: Math.abs(x.n - val) })).sort((a, b2) => a.d - b2.d)[0]; return b && b.d <= 2 ? b.v : null; };
const stat = { fills: 0, strokes: 0, text: 0, radius: 0, space: 0, missedColor: {}, missedText: {} };
const miss = (o, k) => { o[k] = (o[k] || 0) + 1; };
for (const s of page.children.filter(n => n.type === 'SECTION')) { const map = MAPS[s.name], coll = COLL[s.name];
  for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) {
    for (const n of [f, ...f.findAll(() => true)]) {
      for (const key of ['fills', 'strokes']) { const arr = n[key]; if (!Array.isArray(arr) || !arr.length) continue; let changed = false;
        const next = arr.map(p => { if (p.type !== 'SOLID' || (p.boundVariables && p.boundVariables.color)) return p; const kind = key === 'strokes' ? 'stroke' : n.type === 'TEXT' ? (n.fontName !== figma.mixed && n.fontName.family.startsWith('Material') ? 'icon' : 'text') : 'fill';
          const k = hex(p.color) + (p.opacity != null && p.opacity < 1 ? '@' + Math.round(p.opacity * 100) : ''); const token = pickToken(kind, k, n, map); if (!token) { miss(stat.missedColor, s.name[0] + ':' + kind + ':' + k); return p; }
          changed = true; stat[key === 'strokes' ? 'strokes' : 'fills']++; return figma.variables.setBoundVariableForPaint(p, 'color', V('color/' + token, coll)); });
        if (changed) n[key] = next; }
      if (n.type === 'TEXT' && n.fontName !== figma.mixed && n.fontName.family === 'Inter' && !n.textStyleId) { const st = pickStyle(n); if (st) { await figma.loadFontAsync(st.fontName); await n.setTextStyleIdAsync(st.id); stat.text++; } else miss(stat.missedText, n.fontName.style + '/' + n.fontSize + '/' + (n.lineHeight.unit === 'PERCENT' ? Math.round(n.lineHeight.value) + '%' : n.lineHeight.unit)); }
      if ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius > 0 && !(n.boundVariables && n.boundVariables.topLeftRadius)) { const isCircle = n.cornerRadius >= Math.min(n.width, n.height) / 2 - 0.6; const cand = isCircle ? RADIUS.find(r => r.n === 999) : RADIUS.map(r => ({ ...r, d: Math.abs(r.n - n.cornerRadius) })).sort((a, b) => a.d - b.d).find(r => r.d <= 2);
        if (cand) { for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) n.setBoundVariable(c, cand.v); stat.radius++; } }
      if ('layoutMode' in n && n.layoutMode !== 'NONE') { const bv = n.boundVariables || {};
        if (n.itemSpacing > 0 && !bv.itemSpacing) { const v = snapSpace(n.itemSpacing); if (v) { n.setBoundVariable('itemSpacing', v); stat.space++; } }
        for (const k of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) if (n[k] > 0 && !bv[k]) { const v = snapSpace(n[k]); if (v) { n.setBoundVariable(k, v); stat.space++; } } }
    }
    progress((fi + 1) / s.children.length, s.name + ' ' + f.name.slice(0, 20));
  } }
const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => k + '×' + v);
return { fills: stat.fills, strokes: stat.strokes, text: stat.text, radius: stat.radius, space: stat.space, missedColor: top(stat.missedColor), missedText: top(stat.missedText) };
