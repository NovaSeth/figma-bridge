const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
const f = await figma.getNodeByIdAsync('5:2');
const sheet = f.findOne(n => n.name === 'Bottom sheet');
const body = sheet.findOne(n => n.name === 'Body');
const h = body.children.find(n => n.type === 'TEXT' && n.characters === 'Wcześniej od tej osoby');
const done = [];
if (h) {
  const i = body.children.indexOf(h);
  const wrap = figma.createFrame();
  wrap.name = 'Heading 3'; wrap.fills = []; wrap.layoutMode = 'VERTICAL'; wrap.paddingTop = 16;
  wrap.appendChild(h);
  body.insertChild(i, wrap);
  wrap.layoutSizingHorizontal = 'FILL'; wrap.layoutSizingVertical = 'HUG';
  done.push('heading spaced');
}
const loading = await figma.getNodeByIdAsync('22:2');
const ptr = loading.findOne(n => n.name === 'Pull to refresh');
await shot(sheet, { name: 'polish-sheet', scale: 2 });
if (ptr) await shot(ptr.parent.children[0], { name: 'polish-ptr', scale: 2 });
return { done, sheetH: Math.round(sheet.height), sheetY: Math.round(sheet.y), ptr: !!ptr, ptrW: ptr && Math.round(ptr.width) };
