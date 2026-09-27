//# Podgląd górnego pasa sekcji (kontekst #55)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'Jasny motyw');
const clip = figma.createFrame(); clip.name = '__probe'; clip.x = sec.x; clip.y = sec.y; clip.resize(1400, 700); clip.fills = []; clip.clipsContent = true;
page.appendChild(clip);
await shot(clip, { name: 'sec-top', scale: 0.5 });
clip.remove();
return sec.children.filter(n => n.y < 400).map(n => n.type + ' ' + n.name.slice(0, 26) + ' @' + Math.round(n.x) + ',' + Math.round(n.y));
