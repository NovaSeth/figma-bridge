//# Struktura grup „Zrobione"/„Archiwum" na ekranie 05
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const f = page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith('05 '));
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const main = f.children.find(c => c.name === 'Main Content');
const out = [];
const walk = (n, d, max) => { out.push('  '.repeat(d) + n.type[0] + " '" + n.name.slice(0, 20) + "' " + Math.round(n.width) + 'x' + Math.round(n.height) + (n.type === 'TEXT' ? ' «' + n.characters.slice(0, 26) + '»' : '')); if ('children' in n && d < max) n.children.forEach(c => walk(c, d + 1, max)); };
const idx = main.children.findIndex(c => T(c).some(t => /^Zrobione \(/.test(t.characters)));
for (const c of main.children.slice(Math.max(idx - 1, 0))) walk(c, 0, 4);
return out.join('\n');
