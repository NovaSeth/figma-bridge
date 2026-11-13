// tools/smoke-test.js against the mock: every check passes in a dry run, the report has entries, the file
// stays as it was; outside a dry run it refuses and still changes nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createFigma, createFixture } from './mock-figma.mjs';
import { loadPlugin, builtInPrelude, root } from './harness.mjs';

const smoke = readFileSync(join(root, 'tools', 'smoke-test.js'), 'utf8');

test('as a dry run it passes every check, records writes and leaves the file unchanged', async () => {
  const fx = await createFixture();
  const before = fx.mock.snapshot();
  const r = await loadPlugin(fx.mock).run(smoke, { dryRun: true, prelude: builtInPrelude() });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result.checks.filter(c => !c.startsWith('ok')), []);
  assert.equal(r.result.checks.length, 14);
  assert.equal(r.result.variable, 'color/primary');
  assert.equal(r.result.component, 'Button');
  assert.deepEqual(r.dryRun.entries.map(e => [e.op, e.name, e.prop || e.method]), [
    ['call', 'Test file', 'setPluginData'], ['call', 'Screens', 'appendChild'], ['set', 'Screens', 'name'],
    ['set', 'Card', 'name'], ['set', 'Card', 'opacity'], ['remove', 'Card', 'remove']]);
  assert.equal(r.images[0].name, 'smoke-test');
  assert.deepEqual(fx.mock.snapshot(), before);
  // Its own component set leaves the document with the cleanup; the layers Figma keeps inside it are no leftovers.
  assert.equal(r.dryRun.error, null);
});

test('it also runs on an empty file', async () => {
  const mock = createFigma();
  const r = await loadPlugin(mock).run(smoke, { dryRun: true, prelude: builtInPrelude() });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result.checks.filter(c => c.startsWith('FAIL')), []);
  assert.ok(r.dryRun.entries.length >= 3);
  assert.equal(r.dryRun.error, null);
});

test('outside a dry run it stops and changes nothing', async () => {
  const fx = await createFixture();
  const before = fx.mock.snapshot();
  const r = await loadPlugin(fx.mock).run(smoke, { prelude: builtInPrelude() });
  assert.equal(r.ok, false);
  assert.match(r.error, /^not a dry run, nothing changed/);
  assert.deepEqual(fx.mock.snapshot(), before);
});

test('setProp gets the instance font loaded first, also when nothing else on the page uses it', async () => {
  const fx = await createFixture();
  const medium = { family: 'Roboto', style: 'Medium' };
  await fx.figma.loadAllPagesAsync();
  await fx.figma.loadFontAsync(medium);
  for (const variant of fx.button.children) variant.children[0].fontName = medium;
  fx.mock.resetSession();
  const r = await loadPlugin(fx.mock).run(smoke, { dryRun: true, prelude: builtInPrelude() });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.result.checks.filter(c => !c.startsWith('ok')), []);
  assert.ok(r.result.checks.includes('ok   setProp sets a property by its short name'));
});
