// Every helper of the built-in prelude, run the way jobs run it: through code.js with the prelude injected.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFixture } from './mock-figma.mjs';
import { loadPlugin, builtInPrelude } from './harness.mjs';

const job = async (code, fx) => {
  fx = fx || await createFixture();
  const r = await loadPlugin(fx.mock).run(code, { prelude: builtInPrelude() });
  return Object.assign(r, { fx });
};
const ok = async (code, fx) => { const r = await job(code, fx); assert.equal(r.ok, true, r.error); return r; };

test('hex and solid', async () => {
  const { result } = await ok(`return [hex('#FF8000'), hex('0f0'), hex('#00000080'), solid('#000000'), solid('#FFFFFF', 0.5), solid({ r: 0, g: 0, b: 1 })];`);
  assert.deepEqual(result[0], { r: 1, g: 128 / 255, b: 0 });
  assert.deepEqual(result[1], { r: 0, g: 1, b: 0 });
  assert.deepEqual(result[2], { r: 0, g: 0, b: 0 });
  assert.deepEqual(result[3], [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]);
  assert.deepEqual(result[4], [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.5 }]);
  assert.deepEqual(result[5], [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }]);
  const bad = await job(`return hex('#12')`);
  assert.match(bad.error, /hex: not a colour: #12/);
});

test('usePage finds by name or RegExp, loads and switches; creates only when asked', async () => {
  const { result, fx } = await ok(`
    const a = await usePage('Components');
    const names = figma.currentPage.children.map(n => n.name); // readable: the page is loaded
    const b = await usePage(/^Scr/);
    const c = await usePage('Notes', { create: true });
    let missing = null;
    try { await usePage('Nope'); } catch (e) { missing = e.message; }
    return [a.name, names, b.name, c.name, figma.currentPage.name, missing];`);
  assert.deepEqual(result.slice(0, 5), ['Components', ['Button', 'Icon'], 'Screens', 'Notes', 'Notes']);
  assert.match(result[5], /usePage: no page Nope \(pages: Screens, Components, Notes\)/);
  assert.equal(fx.figma.currentPage.name, 'Notes');
});

test('all and texts include the node itself', async () => {
  const { result } = await ok(`
    const card = figma.currentPage.children[0];
    const title = card.children[0];
    return [all(card).map(n => n.name), card.findAll().length, texts(card).map(n => n.name), texts(title).map(n => n.name),
      all(title).map(n => n.name), texts(card.children[1]).length];`);
  assert.deepEqual(result, [['Card', 'Title', 'Badge', 'Mixed'], 3, ['Title', 'Mixed'], ['Title'], ['Title'], 0]);
});

test('byName and one match by string, RegExp or predicate, below the root', async () => {
  const { result } = await ok(`
    const card = one('Card');
    return [
      byName('Title').map(n => n.name), byName(/^(Title|Badge)$/g).length, byName(/^(Title|Badge)$/g).length,
      byName(n => n.type === 'TEXT', card).map(n => n.name), byName('Card', card).length,
      one(/adg/).name, one('Nope'), one(n => n.type === 'RECTANGLE', card).name,
    ];`);
  assert.deepEqual(result, [['Title'], 2, 2, ['Title', 'Mixed'], 0, 'Badge', null, 'Badge']);
});

test('loadFonts loads every font in the subtree, mixed-font text included', async () => {
  const { result, fx } = await ok(`
    const card = one('Card');
    const fonts = await loadFonts(card);
    one('Mixed').characters = 'now editable';
    return fonts.map(f => f.family + ' ' + f.style).sort();`);
  assert.deepEqual(result, ['Inter Bold', 'Roboto Mono Regular']);
  assert.equal(fx.mixedText.characters, 'now editable');
  const unloaded = await job(`one('Mixed').characters = 'x';`);
  assert.match(unloaded.error, /unloaded font/);
  const many = await ok(`return (await loadFonts([one('Title'), one('Badge')])).length;`);
  assert.equal(many.result, 1);
});

test('variable finds by name and collection, returns null when missing, sees new variables', async () => {
  const { result, fx } = await ok(`
    const a = await variable('color/primary');
    const b = await variable('color/primary', 'Brand');
    const missing = await variable('color/none');
    const wrongCollection = await variable('space/md', 'Brand');
    const [colors] = await figma.variables.getLocalVariableCollectionsAsync();
    figma.variables.createVariable('color/fresh', colors, 'COLOR');
    const fresh = await variable('color/fresh');
    return [a.id, b.id, missing, wrongCollection, fresh.name];`);
  assert.deepEqual(result, [fx.primary.id, fx.brandPrimary.id, null, null, 'color/fresh']);
  assert.equal(fx.mock.calls.getLocalVariablesAsync, 4); // read once, then again on each of the three misses
});

test('paintVar binds a solid paint to a colour variable', async () => {
  const { result, fx } = await ok(`
    const byName = await paintVar('color/primary');
    const byObject = await paintVar(await variable('color/primary', 'Brand'));
    one('Card').fills = byName;
    const errors = [];
    for (const v of ['color/none', 'space/md']) { try { await paintVar(v); } catch (e) { errors.push(e.message); } }
    return [byName, byObject[0].boundVariables.color.id, errors];`);
  assert.deepEqual(result[0], [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: fx.primary.id } } }]);
  assert.equal(result[1], fx.brandPrimary.id);
  assert.deepEqual(result[2], ['paintVar: no variable color/none', 'paintVar: space/md is FLOAT, not COLOR']);
  assert.equal(fx.card.fills[0].boundVariables.color.id, fx.primary.id);
});

test('component searches every page, loading them first, and caches', async () => {
  const { result, fx } = await ok(`
    const set = await component('Button');
    const icon = await component('Icon');
    const again = await component('Button');
    return [set.type, set.parent.name, icon.type, again === set, await component('Nope')];`);
  assert.deepEqual(result, ['COMPONENT_SET', 'Components', 'COMPONENT', true, null]);
  assert.equal(fx.mock.calls.loadAllPagesAsync, 2); // the first search, then the miss on 'Nope' ('Icon' came from the cache)
});

test('instance picks the default variant, a variant by string or object, and fails with the options', async () => {
  const { result } = await ok(`
    const names = [];
    for (const v of [undefined, 'Size=Small, State=On', { Size: 'Small' }, { State: 'On' }, 'Size = Large , State = Off'])
      names.push((await instance('Button', v)).mainComponent.name);
    const plain = await instance('Icon');
    let err = null;
    try { await instance('Button', 'Size=Huge'); } catch (e) { err = e.message; }
    let none = null;
    try { await instance('Nope'); } catch (e) { none = e.message; }
    return [names, plain.mainComponent.name, plain.parent.name, err, none];`);
  assert.deepEqual(result[0], ['Size=Large, State=Off', 'Size=Small, State=On', 'Size=Small, State=Off', 'Size=Large, State=On', 'Size=Large, State=Off']);
  assert.equal(result[1], 'Icon');
  assert.equal(result[2], 'Screens');
  assert.match(result[3], /instance: Button has no variant \{"Size":"Huge"\} \(variants: Size=Large, State=Off \| /);
  assert.equal(result[4], 'instance: no component Nope');
});

test('setProp sets by short name (the #id suffix is found) and refuses unknown names', async () => {
  const { result } = await ok(`
    const inst = await instance('Button');
    await loadFonts(inst); // a TEXT property writes into the bound text layer
    const same = setProp(inst, 'Label', 'Tap me');
    setProp(inst, 'State', 'On');
    let err = null;
    try { setProp(inst, 'Nope', 1); } catch (e) { err = e.message; }
    return [same === inst, inst.children[0].characters, inst.mainComponent.name, err];`);
  assert.deepEqual(result.slice(0, 3), [true, 'Tap me', 'Size=Large, State=On']);
  assert.match(result[3], /setProp: Button has no property Nope \(has: Size, State, Label\)/);
});

test('cloneVariant puts the copy into the set and binds the property references again', async () => {
  const { result, fx } = await ok(`
    const set = await component('Button');
    const source = set.children[0];
    // What a bare clone does: the copy's label is no longer bound, so instances ignore the property.
    const bare = source.clone();
    set.appendChild(bare);
    bare.name = 'Size=Bare, State=Off';
    const bareInstance = bare.createInstance();
    setProp(bareInstance, 'Label', 'Ignored');
    const copy = cloneVariant(set, source, 'Size=Compact, State=Off');
    const inst = await instance('Button', 'Size=Compact');
    await loadFonts(inst);
    setProp(inst, 'Label', 'Bound');
    return [copy.parent === set, copy.name, copy.variantProperties.Size, bareInstance.children[0].characters, inst.children[0].characters,
      copy.children[0].componentPropertyReferences];`);
  assert.deepEqual(result.slice(0, 5), [true, 'Size=Compact, State=Off', 'Compact', 'Go', 'Bound']);
  assert.deepEqual(result[5], { characters: fx.labelKey });
});

test('frame makes a hugging auto-layout frame without fill; props win', async () => {
  const { result } = await ok(`
    const col = frame('Column');
    const row = frame('Row', 'HORIZONTAL', { itemSpacing: 8, paddingLeft: 4, primaryAxisSizingMode: 'FIXED' });
    const free = frame('Free', 'NONE');
    return [col, row, free].map(f => [f.name, f.layoutMode, f.primaryAxisSizingMode, f.counterAxisSizingMode, f.fills.length, f.itemSpacing, f.paddingLeft]);`);
  assert.deepEqual(result, [['Column', 'VERTICAL', 'AUTO', 'AUTO', 0, 0, 0], ['Row', 'HORIZONTAL', 'FIXED', 'AUTO', 0, 8, 4], ['Free', 'NONE', 'FIXED', 'FIXED', 0, 0, 0]]);
});

test('text loads its font first, then sets size, characters and fill', async () => {
  const { result, fx } = await ok(`
    const a = await text('Hello');
    const b = await text(42, { family: 'Roboto', style: 'Bold', size: 17, fill: '#FF0000' });
    const c = await text('Paint', { fill: solid('#00FF00', 0.5) });
    return [a, b, c].map(t => [t.characters, t.fontName, t.fontSize, t.fills]);`);
  assert.deepEqual(result[0], ['Hello', { family: 'Inter', style: 'Regular' }, 12, []]);
  assert.deepEqual(result[1], ['42', { family: 'Roboto', style: 'Bold' }, 17, [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]]);
  assert.deepEqual(result[2][3], [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 }, opacity: 0.5 }]);
  assert.ok(fx.mock.loadedFonts.has('Roboto / Bold'));
});

test('evaluating the prelude reads nothing from the document: every helper is lazy', async () => {
  const fx = await createFixture();
  const r = await loadPlugin(fx.mock).run('return 1', { prelude: builtInPrelude() });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(fx.mock.calls, {});
});

test('usePage with a /g pattern finds the page every time, not every other time', async () => {
  const { result } = await ok(`const re = /Screens/g; const names = []; for (let i = 0; i < 3; i++) names.push((await usePage(re)).name); return names;`);
  assert.deepEqual(result, ['Screens', 'Screens', 'Screens']);
});

test('variable() reads the lists once for a name that does not exist', async () => {
  const { result, fx } = await ok(`return await variable('no/such/variable')`);
  assert.equal(result, null);
  assert.equal(fx.mock.calls.getLocalVariablesAsync, 1);
  // A variable created after the lists were cached is still found: a miss on cached lists reads them again.
  const later = await ok(`await variable('color/surface'); const c = (await figma.variables.getLocalVariableCollectionsAsync())[0];
    figma.variables.createVariable('late/one', c, 'COLOR'); return (await variable('late/one')).name;`);
  assert.equal(later.result, 'late/one');
});

// With a clock that jumps 60 ms on every reading, breathe() pauses whenever it is asked; a timer only fires when
// the job really lets go of the thread (the mock's own async calls resolve without one).
// paused(body): the job body, then the number of pauses; the ticking ends with the job.
const paused = body => `let now = Date.now(); Date.now = () => (now += 60);
  let pauses = 0, ticking = true; const tick = () => { if (!ticking) return; pauses++; setTimeout(tick, 0); }; setTimeout(tick, 0);
  try { ${body} } finally { ticking = false; }`;

test('find, inspect and library let Figma breathe during a long scan', async () => {
  for (const call of [`find('no such thing')`, `inspect('page', { depth: 5 })`, `library('variables')`, `library('components')`]) {
    const { result } = await ok(paused(`await ${call}; return pauses;`));
    assert.ok(result >= 1, call + ' never paused');
  }
});

test('find pauses inside one big page too, and still hides invisible instance children afterwards as it found them', async () => {
  const fx = await createFixture();
  const big = fx.figma.createPage();
  big.name = 'Big';
  await fx.figma.setCurrentPageAsync(big);
  for (let i = 0; i < 2500; i++) fx.figma.createFrame().name = 'Row ' + i;
  await fx.figma.setCurrentPageAsync(fx.screens);
  const { result } = await ok(paused(`const out = await find('Row 2499', { page: 'Big' }); return [out.split(' ').slice(1).join(' '), pauses, figma.skipInvisibleInstanceChildren];`), fx);
  assert.equal(result[0], 'FRAME "Row 2499" · Big');
  assert.ok(result[1] >= 2, 'paused ' + result[1] + ' times: once for the page is not enough for 2500 nodes');
  assert.equal(result[2], false);
});

test('the helpers still work in a plugin window from before breathe(): the server may be newer than the open window', async () => {
  const fx = await createFixture();
  // What code.js of that window does: the prelude and the job as one async function of (figma, shot, progress).
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = body => new AsyncFunction('figma', 'shot', 'progress', builtInPrelude() + '\n;return (async () => {\n' + body + '\n})();')(fx.figma, null, () => {});
  assert.equal(await run(`return await find('title')`), fx.title.id + ' TEXT "Title" · Screens › Card');
  assert.match(await run(`return await inspect('page', { depth: 0 })`), /^PAGE "Screens" /);
  assert.match(await run(`return await library('styles')`), /^PAINT 1\n/);
});

test('find switches skipInvisibleInstanceChildren on only while it searches, not while it pauses: a job running beside it keeps its own setting', async () => {
  const fx = await createFixture();
  const big = fx.figma.createPage();
  big.name = 'Big';
  await fx.figma.setCurrentPageAsync(big);
  for (let i = 0; i < 2500; i++) fx.figma.createFrame().name = 'Row ' + i;
  await fx.figma.setCurrentPageAsync(fx.screens);
  const plugin = loadPlugin(fx.mock);
  const scan = plugin.run(paused(`return (await find('Row 2499', { page: 'Big' })).indexOf('Row 2499') > 0;`), { prelude: builtInPrelude() });
  const beside = plugin.run('const seen = new Set(); for (let i = 0; i < 8; i++) { seen.add(figma.skipInvisibleInstanceChildren); await new Promise(ok => setTimeout(ok, 0)); } return Array.from(seen);');
  const [a, b] = await Promise.all([scan, beside]);
  assert.equal(a.result, true, a.error);
  assert.deepEqual(b.result, [false]);
});
