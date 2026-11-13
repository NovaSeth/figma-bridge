// Dry run: writes to existing objects are recorded, not applied; created objects are real and removed after.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFigma, createFixture } from './mock-figma.mjs';
import { loadPlugin, builtInPrelude } from './harness.mjs';

const dry = async (fx, code, prelude = '') => {
  const plugin = loadPlugin(fx.mock);
  const before = fx.mock.snapshot();
  const r = await plugin.run(code, { dryRun: true, prelude });
  return { r, report: r.dryRun, before, after: fx.mock.snapshot() };
};

test('writes to an existing node are recorded and not applied; reads keep the old value', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const card = figma.currentPage.findOne(n => n.name === 'Card');
    card.name = 'Renamed';
    card.fills = [];
    card.resize(10, 20);
    card.children[1].remove();
    return { name: card.name, kids: card.children.length };`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, { name: 'Card', kids: 3 });
  assert.deepEqual(after, before);
  assert.deepEqual(report.counts, { set: 2, call: 1, remove: 1 });
  assert.equal(report.touched, 2);
  assert.equal(report.truncated, false);
  assert.equal(report.error, null);
  const [name, fills, resize, remove] = report.entries;
  assert.deepEqual(name, { op: 'set', id: fx.card.id, name: 'Card', type: 'FRAME', prop: 'name', method: null, from: 'Card', to: 'Renamed' });
  assert.equal(fills.prop, 'fills');
  assert.equal(fills.from, '[{"type":"SOLID","color":{"r":1,"g":0,"b":0}}]');
  assert.equal(fills.to, '[]');
  assert.deepEqual(resize, { op: 'call', id: fx.card.id, name: 'Card', type: 'FRAME', prop: null, method: 'resize', from: null, to: '[10,20]' });
  assert.deepEqual(remove, { op: 'remove', id: fx.badge.id, name: 'Badge', type: 'RECTANGLE', prop: null, method: 'remove', from: null, to: null });
});

test('created nodes are real and mutable during the run, and gone afterwards', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const f = figma.createFrame();
    f.name = 'New'; f.layoutMode = 'VERTICAL'; f.itemSpacing = 8;
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const t = figma.createText(); t.characters = 'hi';
    f.appendChild(t);
    t.layoutSizingHorizontal = 'FILL';
    const copy = f.clone(); copy.name = 'Copy';
    return { name: f.name, mode: f.layoutMode, text: f.children[0].characters, sizing: t.layoutSizingHorizontal, copy: copy.children.length, ids: [f.id, t.id, copy.id] };`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual({ ...r.result, ids: undefined }, { name: 'New', mode: 'VERTICAL', text: 'hi', sizing: 'FILL', copy: 1, ids: undefined });
  assert.deepEqual(report.entries, []);
  assert.deepEqual(report.created, { FRAME: 2, TEXT: 1 });
  assert.equal(report.cleanedUp, 3); // newest first: the clone, the text, then its frame
  for (const id of r.result.ids) assert.equal(await fx.figma.getNodeByIdAsync(id), null);
  assert.deepEqual(after, before);
});

test('a created node appended into an existing parent is a change of that parent, and leaves again', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const card = figma.currentPage.findOne(n => n.name === 'Card');
    const row = figma.createFrame(); row.name = 'Row';
    card.appendChild(row);
    row.layoutSizingHorizontal = 'FILL'; // needs the auto-layout parent for real
    card.insertChild(0, figma.createRectangle());
    return card.children.length;`);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.result, 5);
  assert.deepEqual(report.entries.map(e => [e.op, e.id, e.method]), [['call', fx.card.id, 'appendChild'], ['call', fx.card.id, 'insertChild']]);
  assert.equal(report.entries[0].to.name, 'Row');
  assert.deepEqual(after, before);
});

test('an existing node moved into a created one stays where it is', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const title = figma.currentPage.findOne(n => n.name === 'Title');
    const box = figma.createFrame(); box.name = 'Box';
    box.appendChild(title);
    return [title.parent.name, box.children.length];`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, ['Card', 0]);
  assert.deepEqual(report.entries.map(e => [e.op, e.id, e.method, e.to && e.to.name]), [['call', fx.title.id, 'appendChild', 'Box']]);
  assert.equal(fx.title.parent, fx.card);
  assert.deepEqual(after, before);
});

test('the same host object gives the same wrapper, also inside callbacks', async () => {
  const fx = await createFixture();
  const { r } = await dry(fx, `
    const page = figma.currentPage;
    const card = page.children[0];
    const title = card.findOne(n => n.name === 'Title');
    const seen = [];
    card.findAll(n => { seen.push(n); return false; });
    const fromId = await figma.getNodeByIdAsync(card.id);
    return [
      card === page.findOne(n => n.name === 'Card'), card === fromId, title.parent === card, page === figma.root.children[0],
      page === figma.currentPage, seen[0] === title, card.findAll(n => n === title).length, figma.variables === figma.variables,
      new Set([card, fromId]).size, 'findAll' in card, 'findAll' in title,
    ];`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, [true, true, true, true, true, true, 1, true, 1, true, false]);
});

test('wrapped arguments are unwrapped before every host call', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const [primary] = await figma.variables.getLocalVariablesAsync('COLOR');
    const paint = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', primary);
    const f = figma.createFrame();
    f.fills = [paint];
    f.setBoundVariable('itemSpacing', primary);
    const alias = figma.variables.createVariableAlias(primary);
    const card = figma.currentPage.children[0];
    figma.viewport.scrollAndZoomIntoView([card, f]);
    figma.currentPage.selection = [card];
    const other = figma.root.children[1];
    await figma.setCurrentPageAsync(other);
    const onOther = figma.currentPage === other;
    await figma.setCurrentPageAsync(figma.root.children[0]);
    const set = figma.combineAsVariants([figma.createComponent(), figma.createComponent()], f);
    return [f.fills[0].boundVariables.color.id === primary.id, alias.id === primary.id, onOther, set.type, set.parent === f];`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, [true, true, true, 'COMPONENT_SET', true]);
  assert.equal(fx.mock.state.scrolledTo.length, 2);
  assert.equal(fx.mock.state.scrolledTo[0], fx.card.id);
  assert.deepEqual(report.entries, []);
  assert.equal(fx.screens.selection[0], fx.card); // editor state, passed through
  assert.deepEqual(after, before);
});

test('a callback keeps one wrapper, so figma.off finds what figma.on registered', async () => {
  const fx = await createFixture();
  const { r } = await dry(fx, `const h = () => {}; figma.on('selectionchange', h); figma.on('close', () => {}); figma.off('selectionchange', h);`);
  assert.equal(r.ok, true, r.error);
  assert.equal(fx.mock.state.handlers.length, 1);
});

test('figma.closePlugin, triggerUndo and version saves are blocked and recorded', async () => {
  const fx = await createFixture();
  const { r, report } = await dry(fx, `figma.closePlugin('bye'); figma.triggerUndo(); await figma.saveVersionHistoryAsync('x'); return 'still here';`);
  assert.equal(r.result, 'still here');
  assert.equal(fx.mock.state.closed, false);
  assert.equal(fx.mock.state.undone, undefined);
  assert.deepEqual(report.entries.map(e => [e.op, e.id, e.method]), [['call', null, 'figma.closePlugin'], ['call', null, 'figma.triggerUndo'], ['call', null, 'figma.saveVersionHistoryAsync']]);
  assert.equal(report.touched, 0);
});

test('entries stop at 200, counts do not', async () => {
  const fx = await createFixture();
  const { r, report } = await dry(fx, `const card = figma.currentPage.children[0]; for (let i = 0; i < 250; i++) card.x = i; return card.x;`);
  assert.equal(r.result, 0);
  assert.equal(report.entries.length, 200);
  assert.equal(report.truncated, true);
  assert.equal(report.counts.set, 250);
  assert.equal(report.touched, 1);
});

test('values are summarised: strings to 80 chars, objects to 120, nodes as {id,name}', async () => {
  const fx = await createFixture();
  const { report } = await dry(fx, `
    const [card] = figma.currentPage.children;
    card.name = 'x'.repeat(200);
    card.fills = Array.from({ length: 20 }, () => ({ type: 'SOLID', color: { r: 0.123456, g: 0.5, b: 1 } }));
    card.parent.appendChild(card);
    card.setPluginData('k', 'v');`);
  const [name, fills, append, data] = report.entries;
  assert.equal(name.to.length, 80);
  assert.ok(name.to.endsWith('…'));
  assert.equal(fills.to.length, 120);
  assert.deepEqual(append.to, { id: fx.card.id, name: 'Card' });
  assert.equal(append.id, fx.screens.id);
  assert.equal(data.to, '["k","v"]');
});

test('an error still cleans up the created nodes and reports what was recorded', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const card = figma.currentPage.children[0];
    card.opacity = 0.5;
    const f = figma.createFrame(); card.appendChild(f);
    figma.createFrame();
    throw new Error('halfway');`);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'halfway');
  assert.equal(report.error, 'halfway');
  assert.equal(report.counts.set, 1);
  assert.equal(report.cleanedUp, 2);
  assert.deepEqual(after, before);
});

test('existing variables, collections and styles are recorded; created ones are removed', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const [primary] = await figma.variables.getLocalVariablesAsync('COLOR');
    const [colors] = await figma.variables.getLocalVariableCollectionsAsync();
    primary.name = 'color/renamed';
    primary.setValueForMode(colors.defaultModeId, { r: 1, g: 1, b: 1, a: 1 });
    const mode = colors.addMode('Dark');
    colors.renameMode(colors.defaultModeId, 'Day');
    const fresh = figma.variables.createVariable('color/new', colors, 'COLOR');
    fresh.setValueForMode(colors.defaultModeId, { r: 0, g: 0, b: 0, a: 1 });
    const own = figma.variables.createVariableCollection('Temp');
    figma.variables.createVariable('x', own, 'FLOAT');
    const [red] = await figma.getLocalPaintStylesAsync();
    red.name = 'Brand/Blue';
    const style = figma.createPaintStyle(); style.name = 'Temp style';
    return [primary.name, typeof mode, fresh.valuesByMode[colors.defaultModeId].r];`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, ['color/primary', 'string', 0]);
  assert.deepEqual(report.entries.map(e => [e.op, e.type, e.prop || e.method]), [
    ['set', 'VARIABLE', 'name'], ['call', 'VARIABLE', 'setValueForMode'], ['call', 'VARIABLE_COLLECTION', 'addMode'],
    ['call', 'VARIABLE_COLLECTION', 'renameMode'], ['set', 'PAINT_STYLE', 'name']]);
  assert.deepEqual(report.created, { VARIABLE: 2, VARIABLE_COLLECTION: 1, PAINT_STYLE: 1 });
  assert.equal(report.cleanedUp, 4);
  assert.deepEqual(after, before);
});

test('page switching passes through, the start page comes back and created pages go', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const page = figma.createPage(); page.name = 'Scratch';
    await figma.setCurrentPageAsync(page);
    figma.createFrame();
    return figma.currentPage.name;`);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.result, 'Scratch');
  assert.equal(fx.figma.currentPage, fx.screens);
  assert.deepEqual(report.created, { PAGE: 1, FRAME: 1 });
  assert.deepEqual(after, before);
});

test('combining existing nodes is recorded and the script gets a disposable stand-in', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const card = figma.currentPage.children[0];
    const g = figma.group([card], figma.currentPage);
    g.name = 'Grouped';
    const kids = figma.ungroup(card);
    return [g.name, g.type, kids.length];`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, ['Grouped', 'FRAME', 3]);
  assert.deepEqual(report.entries.map(e => [e.op, e.id, e.method]), [['call', fx.card.id, 'figma.group'], ['call', fx.card.id, 'figma.ungroup']]);
  assert.deepEqual(report.created, {});
  assert.equal(report.cleanedUp, 0);
  assert.deepEqual(after, before);
});

test('recorded calls return what the script needs next', async () => {
  const fx = await createFixture();
  await fx.figma.loadAllPagesAsync();
  const { r, report, before, after } = await dry(fx, `
    await figma.loadAllPagesAsync();
    const button = figma.root.findOne(n => n.name === 'Button');
    const key = button.addComponentProperty('Icon', 'BOOLEAN', true);
    const inst = button.defaultVariant.createInstance();
    const done = await figma.currentPage.children[0].setReactionsAsync([]);
    return [typeof key, key.startsWith('Icon'), inst.type, done === undefined];`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, ['string', true, 'INSTANCE', true]);
  assert.deepEqual(report.entries.map(e => e.method), ['addComponentProperty', 'setReactionsAsync']);
  assert.deepEqual(report.created, { INSTANCE: 1 });
  assert.deepEqual(after, before);
});

test('an instance detached in a dry run is only recorded', async () => {
  const fx = await createFixture();
  await fx.figma.loadAllPagesAsync();
  const inst = fx.button.defaultVariant.createInstance();
  fx.card.appendChild(inst);
  fx.mock.resetSession();
  const { r, report, before, after } = await dry(fx, `
    const inst = figma.currentPage.findOne(n => n.type === 'INSTANCE');
    const frame = inst.detachInstance();
    frame.name = 'Detached';
    return [frame === inst, inst.type];`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, [true, 'INSTANCE']);
  assert.deepEqual(report.entries.map(e => [e.op, e.method || e.prop]), [['call', 'detachInstance'], ['set', 'name']]);
  assert.deepEqual(after, before);
});

test('shot() exports the unchanged state during a dry run', async () => {
  const fx = await createFixture();
  const { r } = await dry(fx, `const card = figma.currentPage.children[0]; card.name = 'X'; await shot(card); return card.name;`);
  assert.equal(r.result, 'Card');
  assert.equal(r.images.length, 1);
  assert.equal(r.images[0].name, fx.card.id.replace(':', '-'));
});

test('the prelude works on the recording proxy and its created nodes are cleaned up', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const row = frame('Row', 'HORIZONTAL', { itemSpacing: 4 });
    const label = await text('Hi', { style: 'Bold', fill: '#FF0000' });
    row.appendChild(label);
    const card = one('Card');
    card.appendChild(row);
    await loadFonts(card);
    one('Title', card).characters = 'Changed';
    const inst = await instance('Button', 'Size=Small, State=On');
    await loadFonts(inst);
    setProp(inst, 'Label', 'Tap');
    const set = await component('Button');
    const copy = cloneVariant(set, set.children[0], 'Size=Tiny, State=Off');
    const probe = copy.createInstance();
    setProp(probe, 'Label', 'Bound');
    card.fills = await paintVar('color/primary');
    return [row.itemSpacing, label.characters, inst.children[0].characters, probe.children[0].characters, one('Title', card).characters];`, builtInPrelude());
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, [4, 'Hi', 'Tap', 'Bound', 'Hello']);
  assert.deepEqual(report.entries.map(e => [e.op, e.name, e.prop || e.method]), [
    ['call', 'Card', 'appendChild'], ['set', 'Title', 'characters'], ['call', 'Button', 'appendChild'], ['set', 'Card', 'fills']]);
  assert.equal(report.created.INSTANCE, 2);
  assert.deepEqual(after, before);
});

test('a dry run on a file where nodes are not recognised refuses to run the job', async () => {
  const mock = createFigma();
  const plugin = loadPlugin(mock);
  const realRoot = Object.getOwnPropertyDescriptor(mock.figma, 'root');
  Object.defineProperty(mock.figma, 'root', { get: () => ({ id: '0:0' }), configurable: true });
  const r = await plugin.run('figma.currentPage.name = "changed"', { dryRun: true });
  Object.defineProperty(mock.figma, 'root', realRoot);
  assert.equal(r.ok, false);
  assert.match(r.error, /dry run unavailable/);
  assert.equal(mock.figma.currentPage.name, 'Page 1');
});

test('a Symbol-keyed method passes through instead of breaking the recorder', async () => {
  const fx = await createFixture();
  const tag = Symbol.for('bridge-test');
  Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf(fx.card)))[tag] = function () { return this.id; };
  const { r } = await dry(fx, `return figma.currentPage.children[0][Symbol.for('bridge-test')]();`);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.result, fx.card.id);
});

test('nodes inside plain host records (style consumers) are wrapped, so writes through them are recorded', async () => {
  const fx = await createFixture();
  fx.card.fillStyleId = fx.red.id;
  const { r, report, before, after } = await dry(fx, `
    const [red] = await figma.getLocalPaintStylesAsync();
    const consumers = await red.getStyleConsumersAsync();
    for (const c of consumers) { c.node.name = 'Restyled'; await c.node.setFillStyleIdAsync(''); }
    return [consumers.length, consumers[0].node === figma.currentPage.children[0], consumers[0].fields];`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, [1, true, ['fills']]);
  assert.deepEqual(report.entries.map(e => [e.op, e.id, e.prop || e.method]), [['set', fx.card.id, 'name'], ['call', fx.card.id, 'setFillStyleIdAsync']]);
  assert.deepEqual(after, before);
});

test('reordering existing styles is recorded; a created style really moves and then goes', async () => {
  const fx = await createFixture();
  const blue = fx.figma.createPaintStyle(); blue.name = 'Brand/Blue';
  const { r, report, before, after } = await dry(fx, `
    const [red, blue] = await figma.getLocalPaintStylesAsync();
    figma.moveLocalPaintStyleAfter(red, blue);
    const mine = figma.createPaintStyle();
    figma.moveLocalPaintStyleAfter(mine, null);
    return (await figma.getLocalPaintStylesAsync()).map(s => s.name);`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, ['Style', 'Brand/Red', 'Brand/Blue']);
  assert.deepEqual(report.entries.map(e => [e.op, e.id, e.method]), [['call', fx.red.id, 'figma.moveLocalPaintStyleAfter']]);
  assert.deepEqual(after, before);
});

test('a job that keeps going after it returned cannot create anything once the dry run is over', async () => {
  const fx = await createFixture();
  const plugin = loadPlugin(fx.mock);
  const before = fx.mock.snapshot();
  // A missing await: the text is created after the font loads, which in Figma is after the job has returned.
  const r = await plugin.run(`
    setTimeout(() => { try { figma.createFrame(); } catch (e) { globalThis.late = e.message; } }, 5);
    return 'returned';`, { dryRun: true });
  assert.equal(r.ok, true, r.error);
  await new Promise(ok => setTimeout(ok, 30));
  assert.match(plugin.ctx.late, /dry run is over/);
  assert.deepEqual(fx.mock.snapshot(), before);
});

test('a created object the cleanup cannot remove is named in the report error', async () => {
  const fx = await createFixture();
  const createFrame = fx.figma.createFrame;
  fx.figma.createFrame = function () {
    const f = createFrame.call(this);
    Object.defineProperty(f, 'remove', { value() { throw new Error('in remove: stuck'); } });
    return f;
  };
  try {
    const { r, report } = await dry(fx, `const f = figma.createFrame(); f.name = 'Stuck'; figma.createRectangle(); return f.id;`);
    assert.equal(r.ok, true, r.error);
    assert.equal(report.cleanedUp, 1);
    assert.equal(report.error, 'cleanup could not remove ' + r.result + ' (Stuck: in remove: stuck)');
  } finally { fx.figma.createFrame = createFrame; }
});

test('a sublayer of a created node moved into an existing parent is cleaned up with the rest', async () => {
  const fx = await createFixture();
  const { r, report, before, after } = await dry(fx, `
    const card = figma.currentPage.findOne(n => n.name === 'Card');
    const copy = card.clone();
    const title = copy.children[0];
    card.appendChild(title); // leaves the clone: removing the clone alone would leave it in the card
    return [title.parent === card, copy.children.length];`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, [true, 2]);
  assert.deepEqual(report.entries.map(e => [e.op, e.id, e.method]), [['call', fx.card.id, 'appendChild']]);
  assert.deepEqual(after, before);
});

test('what Figma keeps of a removed component set is not reported as left behind', async () => {
  const fx = await createFixture();
  const { r, report } = await dry(fx, `
    const a = figma.createComponent(); a.name = 'State=A';
    const label = figma.createText(); label.name = 'Label'; a.appendChild(label);
    const b = figma.createComponent(); b.name = 'State=B';
    const set = figma.combineAsVariants([a, b], figma.currentPage);
    label.componentPropertyReferences = { characters: set.addComponentProperty('Label', 'TEXT', 'A') };
    return set.id;`);
  assert.equal(r.ok, true, r.error);
  assert.equal(report.error, null);
  assert.equal(fx.figma.currentPage.children.some(n => n.id === r.result), false, 'the set left the page');
});
