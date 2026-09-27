//# Migracja M1b: pozostałe style tekstu i kolor z alfą
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(), vars = await figma.variables.getLocalVariablesAsync();
const colId = n => cols.find(c => c.name === n).id; const V = (n, c) => vars.find(v => v.name === n && v.variableCollectionId === colId(c));
const styles = await figma.getLocalTextStylesAsync();
const stat = { text: 0, alpha: 0, left: {} };
for (const s of page.children.filter(n => n.type === 'SECTION')) { const coll = s.name === 'Jasny motyw' ? 'Color' : 'Color Dark';
  for (const f of s.children.filter(n => n.type === 'FRAME')) {
    for (const n of f.findAll(x => x.type === 'TEXT' && !x.textStyleId && x.fontName !== figma.mixed && x.fontName.family === 'Inter')) {
      const lh = n.lineHeight.unit === 'PERCENT' ? n.lineHeight.value : n.lineHeight.unit === 'PIXELS' ? n.lineHeight.value / n.fontSize * 100 : 140;
      const cand = styles.filter(x => x.fontName.style === n.fontName.style).map(x => ({ x, d: Math.abs(x.fontSize - n.fontSize) * 10 + Math.abs(x.lineHeight.value - lh) * 0.35 })).sort((a, b) => a.d - b.d)[0];
      if (cand && cand.d <= 26) { await figma.loadFontAsync(cand.x.fontName); await n.setTextStyleIdAsync(cand.x.id); stat.text++; }
      else stat.left[n.fontName.style + '/' + n.fontSize + '/' + Math.round(lh) + '%'] = (stat.left[n.fontName.style + '/' + n.fontSize + '/' + Math.round(lh) + '%'] || 0) + 1;
    }
    for (const n of f.findAll(x => Array.isArray(x.fills) && x.fills.some(p => p.type === 'SOLID' && !(p.boundVariables && p.boundVariables.color)))) {
      n.fills = n.fills.map(p => { if (p.type !== 'SOLID' || (p.boundVariables && p.boundVariables.color)) return p; const h = '#' + [p.color.r, p.color.g, p.color.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
        const name = { '#80868B': 'outline', '#8E8E93': 'outline' }[h]; if (!name) return p; stat.alpha++; return figma.variables.setBoundVariableForPaint(p, 'color', V('color/' + name, coll)); });
    }
  } }
return { text: stat.text, alpha: stat.alpha, left: Object.entries(stat.left).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + '×' + v) };
