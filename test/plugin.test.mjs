// code.js outside dry runs: results, the error cleanup, and prelude scoping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFigma, createFixture } from './mock-figma.mjs';
import { loadPlugin, builtInPrelude, PRELUDE_SEPARATOR } from './harness.mjs';

test('the mock is strict: a look-alike `this` or argument is rejected like in Figma', async () => {
  const { figma } = createFigma();
  const frame = figma.createFrame();
  const fake = new Proxy({}, { get: (_, k) => frame[k] });
  let proto = frame;
  while (!Object.getOwnPropertyDescriptor(proto, 'name')) proto = Object.getPrototypeOf(proto);
  assert.throws(() => Object.getOwnPropertyDescriptor(proto, 'name').get.call(fake), /Expected a Figma object/);
  assert.throws(() => frame.remove.call(fake), /Expected a Figma object/);
  assert.throws(() => figma.currentPage.appendChild(fake), /Expected a Figma object/);
  assert.throws(() => { figma.currentPage = figma.currentPage; }, /setCurrentPageAsync/);
});

test('posts the context on load and answers ready', async () => {
  const mock = createFigma({ fileKey: 'KEY1' });
  loadPlugin(mock);
  assert.deepEqual(mock.messages[0], { type: 'context', fileKey: 'KEY1', fileName: 'Test file' });
  await mock.figma.ui.onmessage({ type: 'ready' });
  assert.equal(mock.messages.at(-1).type, 'context');
});

test('a normal job applies its writes and returns its value, shots and progress', async () => {
  const { mock, card } = await createFixture();
  const plugin = loadPlugin(mock);
  const r = await plugin.run(`
    const card = figma.currentPage.findOne(n => n.name === 'Card');
    card.name = 'Card 2';
    progress(0.5, 'half');
    await shot(card, { name: 'card' });
    return { name: card.name, kids: card.children.length };`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, { name: 'Card 2', kids: 3 });
  assert.equal(r.dryRun, null);
  assert.equal(r.images[0].name, 'card');
  assert.ok(r.images[0].bytes.length > 4);
  assert.equal(card.name, 'Card 2');
  assert.ok(mock.messages.some(m => m.type === 'progress' && m.value === 0.5 && m.note === 'half'));
});

test('await breathe() and await progress() hand control back to Figma, at most every 50 ms', async () => {
  const plugin = loadPlugin(createFigma());
  // A timer can only fire once the job lets go of the thread.
  const soon = await plugin.run('let ticked = false; setTimeout(() => { ticked = true; }, 0); await breathe(); await progress(0.1); return ticked;');
  assert.equal(soon.result, false, 'under 50 ms since the last pause: no pause');
  const busy = `let ticked = false; setTimeout(() => { ticked = true; }, 0);
    const t = Date.now(); while (Date.now() - t < 60) {}
    const before = ticked; await PAUSE; return [before, ticked];`;
  assert.deepEqual((await plugin.run(busy.replace('PAUSE', 'breathe()'))).result, [false, true]);
  assert.deepEqual((await plugin.run(busy.replace('PAUSE', 'progress(0.5)'))).result, [false, true]);
  assert.deepEqual((await plugin.run(busy.replace('PAUSE', 'breathe()'), { dryRun: true })).result, [false, true]);
  // Without await, progress() still only reports, as before.
  assert.equal((await plugin.run('progress(0.2, "x"); return 1')).result, 1);
});

test('skipInvisibleInstanceChildren set by one job does not carry over to the next', async () => {
  const plugin = loadPlugin(createFigma());
  assert.equal((await plugin.run('figma.skipInvisibleInstanceChildren = true; return figma.skipInvisibleInstanceChildren')).result, true);
  assert.equal((await plugin.run('return figma.skipInvisibleInstanceChildren')).result, false);
});

test('undefined result becomes null; old clients without prelude/dryRun keep working', async () => {
  const mock = createFigma();
  const plugin = loadPlugin(mock);
  assert.equal((await plugin.run('figma.currentPage.name = "x"')).result, null);
  const r = await plugin.run('return 1 + 1', { legacy: true });
  assert.equal(r.ok, true);
  assert.equal(r.result, 2);
});

test('after an error the newcomers on the start page are removed, sections and old nodes stay', async () => {
  const { mock, figma, card, section } = await createFixture();
  const plugin = loadPlugin(mock);
  const r = await plugin.run(`
    figma.createFrame(); figma.createFrame().name = 'half done';
    figma.createSection();
    throw new Error('boom');`);
  assert.equal(r.ok, false);
  assert.match(r.error, /^boom \(posprzątano 2 niedokończonych węzłów\)$/);
  const names = figma.currentPage.children.map(n => n.name);
  assert.deepEqual(names.filter(n => n !== 'Section'), ['Card', 'Keep me']);
  assert.equal(card.removed, false);
  assert.equal(section.removed, false);
});

test('a syntax error is reported, not thrown', async () => {
  const plugin = loadPlugin(createFigma());
  const r = await plugin.run('return (');
  assert.equal(r.ok, false);
  assert.match(r.error, /Unexpected|SyntaxError|end of input/i);
});

test('a node in the return value becomes an error instead of a lost reply', async () => {
  const plugin = loadPlugin(createFigma());
  const r = await plugin.run('return figma.currentPage');
  assert.equal(r.ok, false);
  assert.match(r.error, /not serialisable/);
});

test('the prelude runs before the job and the job sees its helpers', async () => {
  const plugin = loadPlugin(createFigma());
  const r = await plugin.run('return helper() + 1', { prelude: 'const helper = () => 41;' });
  assert.equal(r.result, 42);
});

test('a job may redeclare prelude names: its own const hex shadows the helper', async () => {
  const plugin = loadPlugin(createFigma());
  const prelude = builtInPrelude();
  const r = await plugin.run(`
    const hex = h => 'mine:' + h;
    const texts = () => 'mine';
    function frame() { return 'mine'; }
    return [hex('#fff'), texts(), frame(), solid('#FF0000')[0].color.r];`, { prelude });
  assert.equal(r.ok, true, r.error);
  // solid() keeps using the prelude's own hex, not the job's
  assert.deepEqual(r.result, ['mine:#fff', 'mine', 'mine', 1]);
});

test('every prelude file gets its own scope: a project prelude may redeclare built-in names', async () => {
  const plugin = loadPlugin(createFigma());
  const project = 'const hex = h => "project"; const texts = n => "project texts"; const projectOnly = () => hex();';
  const r = await plugin.run('return [hex("#000"), projectOnly(), solid("#000")[0].color]',
    { prelude: builtInPrelude() + PRELUDE_SEPARATOR + project });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result, ['project', 'project', { r: 0, g: 0, b: 0 }]);
});

test('the same names in one flat body would be a SyntaxError (why the scopes exist)', async () => {
  const plugin = loadPlugin(createFigma());
  const r = await plugin.run('const hex = 1;\nconst hex = 2;');
  assert.equal(r.ok, false);
  assert.match(r.error, /already been declared/);
});

test('a prelude with top-level await and a trailing line comment still reaches the job', async () => {
  const plugin = loadPlugin(createFigma());
  const r = await plugin.run('return ready', { prelude: 'const ready = await Promise.resolve("yes"); // trailing' });
  assert.equal(r.result, 'yes');
});

test('evaluating the built-in prelude does not touch the document', async () => {
  const { mock } = await createFixture();
  const plugin = loadPlugin(mock);
  const before = mock.snapshot();
  const r = await plugin.run('return 1', { prelude: builtInPrelude() });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(mock.calls, {});
  assert.deepEqual(mock.snapshot(), before);
});

test('the listen toggle is kept in clientStorage and handed back to the window on ready', async () => {
  const mock = createFigma();
  const store = {};
  mock.figma.clientStorage = { getAsync: async key => store[key], setAsync: async (key, value) => { store[key] = value; } };
  loadPlugin(mock);
  const settle = () => new Promise(ok => setImmediate(ok));
  await mock.figma.ui.onmessage({ type: 'ready' });
  await settle();
  assert.ok(!mock.messages.some(m => m.type === 'listen'), 'nothing stored yet: the server state stands');
  await mock.figma.ui.onmessage({ type: 'listen', on: true });
  await settle();
  assert.equal(store.listen, true);
  await mock.figma.ui.onmessage({ type: 'ready' });
  await settle();
  assert.deepEqual(mock.messages.slice(-2), [{ type: 'context', fileKey: 'TESTFILE', fileName: 'Test file' }, { type: 'listen', on: true }]);
});

test('without clientStorage the toggle messages are harmless', async () => {
  const mock = createFigma();
  loadPlugin(mock);
  await mock.figma.ui.onmessage({ type: 'listen', on: true });
  await mock.figma.ui.onmessage({ type: 'ready' });
  assert.equal(mock.messages.at(-1).type, 'context');
});

test('a job that fails while another one runs does not remove the other job\'s new nodes', async () => {
  const { mock, figma } = await createFixture();
  const plugin = loadPlugin(mock);
  // The window hands over the next job while the first is at an await: both are "new on the page" to each other.
  const failing = plugin.run(`figma.createFrame().name = 'half done'; await new Promise(ok => setTimeout(ok, 40)); throw new Error('boom');`);
  const other = plugin.run(`figma.createFrame().name = 'finished by the other job'; return 1;`);
  const [a, b] = await Promise.all([failing, other]);
  assert.equal(b.ok, true, b.error);
  assert.equal(a.error, 'boom (bez sprzątania: w tym czasie działało inne zadanie)');
  assert.ok(figma.currentPage.children.some(n => n.name === 'finished by the other job'));
  // Alone again, a failing job cleans up after itself as before.
  const alone = await plugin.run(`figma.createFrame().name = 'again'; throw new Error('boom');`);
  assert.equal(alone.error, 'boom (posprzątano 1 niedokończonych węzłów)');
});

test('progress() called for every node reaches the window a few times, and the end always', async () => {
  const mock = createFigma();
  const plugin = loadPlugin(mock);
  const r = await plugin.run('for (let i = 0; i < 2000; i++) progress(i / 2000, "node " + i); progress(1, "done"); return 1;');
  assert.equal(r.ok, true, r.error);
  const sent = mock.messages.filter(m => m.type === 'progress');
  assert.ok(sent.length <= 5, sent.length + ' messages for 2001 calls');
  assert.deepEqual([sent[0].value, sent.at(-1)], [0, { type: 'progress', value: 1, note: 'done' }]);
  // The next job starts fresh: its first report is not swallowed.
  await plugin.run('progress(0.3, "next job")');
  assert.equal(mock.messages.filter(m => m.type === 'progress').at(-1).note, 'next job');
});
