//# Audyt: statystyki użycia kolorów, typografii, promieni i odstępów w makietach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const stats = {}; const add = (g, k) => { stats[g] = stats[g] || {}; stats[g][k] = (stats[g][k] || 0) + 1; };
const frames = [];
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  frames.push({ id: f.id, name: f.name, theme: s.name[0], h: Math.round(f.height) });
  const th = s.name[0];
  for (const n of f.findAll(() => true)) {
    if (n.visible === false) continue;
    for (const key of ['fills', 'strokes']) { const arr = n[key]; if (!Array.isArray(arr)) continue; for (const p of arr) if (p.type === 'SOLID' && p.visible !== false) add(th + ':' + (n.type === 'TEXT' ? 'text' : key === 'strokes' ? 'stroke' : 'fill'), hex(p.color) + (p.opacity != null && p.opacity < 1 ? '@' + Math.round(p.opacity * 100) : '')); }
    if (n.type === 'TEXT' && n.fontName !== figma.mixed && n.fontSize !== figma.mixed) { const lh = n.lineHeight === figma.mixed ? 'mixed' : n.lineHeight.unit === 'AUTO' ? 'auto' : n.lineHeight.unit === 'PIXELS' ? Math.round(n.lineHeight.value / n.fontSize * 100) + '%' : Math.round(n.lineHeight.value) + '%'; const ls = n.letterSpacing === figma.mixed ? 'm' : n.letterSpacing.unit === 'PIXELS' ? Math.round(n.letterSpacing.value / n.fontSize * 1000) / 10 : Math.round(n.letterSpacing.value * 10) / 10; add('type', n.fontName.family.slice(0, 8) + '/' + n.fontName.style + '/' + n.fontSize + '/' + lh + '/' + ls); }
    if ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius > 0) add('radius', String(Math.round(n.cornerRadius * 10) / 10));
    if ('layoutMode' in n && n.layoutMode !== 'NONE') { if (n.itemSpacing > 0) add('gap', String(Math.round(n.itemSpacing * 10) / 10)); for (const k of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) if (n[k] > 0) add('pad', String(Math.round(n[k] * 10) / 10)); }
  }
}
const top = (o, n) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => k + '×' + v).join('  ');
return { frames: frames.length, list: frames, 'J:fill': top(stats['J:fill'], 40), 'J:text': top(stats['J:text'], 30), 'J:stroke': top(stats['J:stroke'], 20), 'C:fill': top(stats['C:fill'], 30), 'C:text': top(stats['C:text'], 25), 'C:stroke': top(stats['C:stroke'], 15), type: top(stats.type, 60), radius: top(stats.radius, 25), gap: top(stats.gap, 25), pad: top(stats.pad, 30) };
