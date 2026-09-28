// The knowledge helpers of prelude.js (inspect, find, library) on mock files, run the way the MCP tools run
// them: a job `return await inspect(...)` with the built-in prelude. Outputs are read by a model, so their
// size has budgets here, not only their content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFigma, createFixture } from './mock-figma.mjs';
import { builtInPrelude, loadPlugin, runHelper } from './harness.mjs';

const INTER = { family: 'Inter', style: 'Regular' }, BOLD = { family: 'Inter', style: 'Bold' };

// A 60-node screen: header, a list of 8 rows (icon, two texts, chevron), a footer with two button instances,
// plus variables, styles and a component set on a second page that is not loaded at the start.
async function createScreen() {
  const mock = createFigma({ fileKey: 'SCREENKEY', fileName: 'Screen file' });
  const { figma } = mock;
  await figma.loadFontAsync(INTER); await figma.loadFontAsync(BOLD);
  const colors = figma.variables.createVariableCollection('Tokens');
  const dark = colors.addMode('Dark');
  colors.renameMode(colors.defaultModeId, 'Light');
  const blue = figma.variables.createVariable('palette/blue', colors, 'COLOR');
  blue.setValueForMode(colors.defaultModeId, { r: 0, g: 0.341, b: 0.816, a: 1 });
  blue.setValueForMode(dark, { r: 0, g: 0.341, b: 0.816, a: 1 });
  const surface = figma.variables.createVariable('color/surface', colors, 'COLOR');
  surface.setValueForMode(colors.defaultModeId, { r: 1, g: 1, b: 1, a: 1 });
  surface.setValueForMode(dark, { r: 0.07, g: 0.07, b: 0.075, a: 1 });
  const accent = figma.variables.createVariable('color/accent', colors, 'COLOR');
  accent.setValueForMode(colors.defaultModeId, figma.variables.createVariableAlias(blue));
  accent.setValueForMode(dark, figma.variables.createVariableAlias(blue));
  const spaceMd = figma.variables.createVariable('space/md', colors, 'FLOAT');
  spaceMd.setValueForMode(colors.defaultModeId, 12); spaceMd.setValueForMode(dark, 12);
  const title = figma.variables.createVariable('copy/title', colors, 'STRING');
  title.setValueForMode(colors.defaultModeId, 'Inbox'); title.setValueForMode(dark, 'Inbox');

  const body = figma.createTextStyle(); body.name = 'Body/M'; body.fontName = INTER; body.fontSize = 15; body.lineHeight = { unit: 'PIXELS', value: 20 };
  const heading = figma.createTextStyle(); heading.name = 'Heading/L'; heading.fontName = BOLD; heading.fontSize = 28; heading.letterSpacing = { unit: 'PERCENT', value: -1 };
  const border = figma.createPaintStyle(); border.name = 'Border/Subtle'; border.paints = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.12 }];
  const lift = figma.createEffectStyle(); lift.name = 'Elevation/1';
  lift.effects = [{ type: 'DROP_SHADOW', offset: { x: 0, y: 2 }, radius: 8, color: { r: 0, g: 0, b: 0, a: 0.2 }, visible: true }];

  const screens = figma.currentPage; screens.name = 'Screens';
  const components = figma.createPage(); components.name = 'Components';
  await figma.setCurrentPageAsync(components);
  const variant = name => { const c = figma.createComponent(); c.name = name; c.layoutMode = 'HORIZONTAL'; const t = figma.createText(); t.name = 'Label'; t.characters = 'OK'; c.appendChild(t); return c; };
  const button = figma.combineAsVariants([variant('Kind=Primary'), variant('Kind=Secondary')], components);
  button.name = 'Button';
  const labelKey = button.addComponentProperty('Label', 'TEXT', 'OK');
  for (const v of button.children) v.children[0].componentPropertyReferences = { characters: labelKey };
  button.description = 'Main actions.';
  await figma.setCurrentPageAsync(screens);

  const text = (chars, style) => { const t = figma.createText(); t.characters = chars; t.name = chars; if (style) t.textStyleId = style.id; return t; };
  const screen = figma.createFrame(); screen.name = 'Inbox'; screen.resize(390, 844); screen.x = 100; screen.y = 40;
  screen.layoutMode = 'VERTICAL'; screen.itemSpacing = 16; screen.paddingTop = screen.paddingBottom = 24; screen.paddingLeft = screen.paddingRight = 16;
  screen.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', surface)];
  const header = figma.createFrame(); header.name = 'Header'; header.layoutMode = 'HORIZONTAL'; header.primaryAxisAlignItems = 'SPACE_BETWEEN'; header.counterAxisAlignItems = 'CENTER'; header.fills = [];
  screen.appendChild(header); header.layoutSizingHorizontal = 'FILL'; header.layoutSizingVertical = 'HUG';
  const heading1 = text('Inbox', heading); heading1.name = 'Title'; header.appendChild(heading1);
  const avatar = figma.createRectangle(); avatar.name = 'Avatar'; avatar.resize(32, 32); avatar.cornerRadius = 16; avatar.fills = [{ type: 'IMAGE', scaleMode: 'FILL' }]; header.appendChild(avatar);
  const list = figma.createFrame(); list.name = 'List'; list.layoutMode = 'VERTICAL'; list.fills = []; list.cornerRadius = 12;
  list.setBoundVariable('itemSpacing', spaceMd); list.strokeStyleId = border.id; list.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  screen.appendChild(list);
  for (let i = 1; i <= 8; i++) {
    const row = figma.createFrame(); row.name = 'Row ' + i; row.layoutMode = 'HORIZONTAL'; row.itemSpacing = 8; row.fills = [];
    row.paddingTop = row.paddingBottom = 12; row.paddingLeft = row.paddingRight = 16;
    list.appendChild(row); row.layoutSizingHorizontal = 'FILL';
    const icon = figma.createRectangle(); icon.name = 'Icon'; icon.resize(24, 24); icon.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', accent)];
    const texts = figma.createFrame(); texts.name = 'Texts'; texts.layoutMode = 'VERTICAL'; texts.fills = [];
    texts.appendChild(text('Message ' + i, body));
    const sub = text('A longer preview line of message number ' + i + ' that runs past the sixty character clip'); sub.name = 'Preview'; sub.opacity = 0.6; texts.appendChild(sub);
    const chevron = figma.createRectangle(); chevron.name = 'Chevron'; chevron.resize(8, 14); chevron.visible = i !== 8;
    for (const n of [icon, texts, chevron]) row.appendChild(n);
    texts.layoutSizingHorizontal = 'FILL';
  }
  const footer = figma.createFrame(); footer.name = 'Footer'; footer.layoutMode = 'HORIZONTAL'; footer.itemSpacing = 8; footer.fills = []; footer.effectStyleId = lift.id;
  screen.appendChild(footer);
  const primary = button.children[0].createInstance(); footer.appendChild(primary);
  const secondary = button.children[1].createInstance(); secondary.setProperties({ [labelKey]: 'Later' }); footer.appendChild(secondary);
  const note = text('Draft'); note.locked = true; note.rotation = 90; footer.appendChild(note);
  const badge = figma.createRectangle(); badge.name = 'Badge'; screen.appendChild(badge);
  badge.layoutPositioning = 'ABSOLUTE'; badge.x = 350; badge.y = 12; badge.resize(16, 16);
  mock.resetSession();
  return { mock, figma, screen, list, button, primary, secondary, components, labelKey };
}

test('the screen fixture has 60 nodes under the screen frame, the frame included', async () => {
  const { figma, screen } = await createScreen();
  assert.equal(screen.findAll().length + 1, 60);
  assert.equal(figma.currentPage.name, 'Screens');
});

test('inspect: one line per node with layout, tokens, text, instances and flags', async () => {
  const { mock, screen } = await createScreen();
  const out = await runHelper(mock, `inspect(${JSON.stringify(screen.id)})`);
  const lines = out.split('\n');
  assert.equal(lines[0], `FRAME "Inbox" ${screen.id} 390×844 @100,40 V gap16 p24/16 fill=color/surface`);
  assert.match(out, /\n  FRAME "Header" \S+ 100×100 H gap=auto align=center fill×hug\n/);
  assert.match(out, /\n    TEXT "Title" \S+ 100×100 text="Inbox" style:Heading\/L\n/);
  assert.match(out, /\n    RECTANGLE "Avatar" \S+ 32×32 fill=image r16\n/);
  assert.match(out, /\n  FRAME "List" \S+ 100×100 V gap=space\/md stroke=style:Border\/Subtle r12\n/);
  assert.match(out, /\n    FRAME "Row 1" \S+ 100×100 H gap8 p12\/16 fill×fixed\n/);
  assert.match(out, /\n      RECTANGLE "Icon" \S+ 24×24 fill=color\/accent\n/);
  assert.match(out, /\n      FRAME "Texts" \S+ 100×100 V fill×fixed \[\+2\]\n/);
  assert.match(out, /\n      RECTANGLE "Chevron" \S+ 8×14 hidden\n/);
  assert.match(out, /\n  FRAME "Footer" \S+ 100×100 H gap8 fx=style:Elevation\/1\n/);
  assert.match(out, /\n    INSTANCE "Button" \S+ 100×100 H fill=#FFFFFF →"Button"\{Kind=Primary\} \[\+1\]\n/);
  assert.match(out, /\n    INSTANCE "Button" \S+ 100×100 H fill=#FFFFFF →"Button"\{Kind=Secondary,Label="Later"\} \[\+1\]\n/);
  assert.match(out, /\n    TEXT "Draft" \S+ 100×100 Inter\/Regular\/12 rot90 locked\n/);
  assert.match(out, /\n  RECTANGLE "Badge" \S+ 16×16 abs@350,12$/);
  assert.equal(lines.length, 42);
});

test('inspect: depth, maxLines with "… N more", instances on request, texts clipped', async () => {
  const { mock, screen, list, primary } = await createScreen();
  assert.equal(await runHelper(mock, `inspect(${JSON.stringify(screen.id)}, { depth: 0 })`), `FRAME "Inbox" ${screen.id} 390×844 @100,40 V gap16 p24/16 fill=color/surface [+4]`);
  const capped = await runHelper(mock, `inspect(${JSON.stringify(screen.id)}, { maxLines: 5 })`);
  assert.equal(capped.split('\n').length, 6);
  assert.equal(capped.split('\n')[5], '… 37 more (maxLines 5)');
  const deep = await runHelper(mock, `inspect(${JSON.stringify(list.id)}, { depth: 9 })`);
  assert.match(deep, /\n      TEXT "Message 1" \S+ 100×100 style:Body\/M\n/);
  assert.match(deep, /TEXT "Preview" \S+ 100×100 text="A longer preview line of message number 1 that runs past th…" Inter\/Regular\/12 op60%/);
  const opened = await runHelper(mock, `inspect(${JSON.stringify(primary.parent.id)}, { instances: true })`);
  assert.match(opened, /\n    TEXT "Label" \S+ 100×100 text="OK" Inter\/Regular\/12\n/);
  // The target itself is opened even when it is an instance.
  assert.match(await runHelper(mock, `inspect(${JSON.stringify(primary.id)})`), /^INSTANCE "Button" [^\n]*\n  TEXT "Label"/);
});

test('budget: the 60-node screen at depth 3 fits in 2500 characters (42 lines), every node in 4000, no line over 120', async () => {
  const { mock, screen } = await createScreen();
  const out = await runHelper(mock, `inspect(${JSON.stringify(screen.id)}, { depth: 3 })`);
  const lines = out.split('\n');
  assert.equal(lines.length, 42);
  assert.ok(out.length <= 2500, out.length + ' characters');
  assert.ok(lines.every(l => l.length <= 120), lines.find(l => l.length > 120));
  const all = await runHelper(mock, `inspect(${JSON.stringify(screen.id)}, { depth: 9, instances: true })`);
  assert.equal(all.split('\n').length, 60);
  assert.ok(all.length <= 4000, all.length + ' characters for all 60 nodes');
});

test('inspect targets: selection, page, file, a page or node by name, an id on an unloaded page', async () => {
  const { mock, figma, screen, button } = await createScreen();
  await assert.rejects(runHelper(mock, 'inspect()'), /nothing selected in Figma/);
  figma.currentPage.selection = [screen.children[0], screen.children[2]];
  const sel = await runHelper(mock, 'inspect("selection", { depth: 0 })');
  assert.deepEqual(sel.split('\n').map(l => l.split(' ').slice(0, 2).join(' ')), ['FRAME "Header"', 'FRAME "Footer"']);
  assert.match(await runHelper(mock, 'inspect("page", { depth: 1 })'), /^PAGE "Screens" \S+\n  FRAME "Inbox" [^\n]* \[\+4\]$/);
  // An id on the Components page, which the session has not loaded: the helper loads it.
  assert.match(await runHelper(mock, `inspect(${JSON.stringify(button.id)}, { depth: 1 })`),
    /^COMPONENT_SET "Button" \S+ 100×100 @0,0 \{Kind=Primary\|Secondary,Label:text\}\n  COMPONENT "Kind=Primary" \S+ 100×100 H fill=#FFFFFF \[\+1\]/);
  assert.match(await runHelper(mock, 'inspect("file", { depth: 1 })'), /^DOCUMENT "Screen file" 0:1\n  PAGE "Screens" \S+ \[\+1\]\n  PAGE "Components" \S+ \[\+1\]$/);
  assert.match(await runHelper(mock, 'inspect("Components", { depth: 0 })'), /^PAGE "Components" \S+ \[\+1\]$/);
  const byName = await runHelper(mock, 'inspect("Icon", { depth: 0 })');
  assert.match(byName, /^RECTANGLE "Icon" \S+ 24×24 fill=color\/accent\n\(\+7 more named "Icon": \S+ \S+ \S+ \S+ \S+ …\)$/);
  await assert.rejects(runHelper(mock, 'inspect("Nope")'), /no node named "Nope"/);
  await assert.rejects(runHelper(mock, 'inspect("9:999")'), /no node 9:999/);
});

test('inspect works inside a dry run and changes nothing', async () => {
  const { mock, screen } = await createScreen();
  const before = mock.snapshot();
  const plain = await runHelper(mock, `inspect(${JSON.stringify(screen.id)})`);
  const r = await loadPlugin(mock).run(`return await inspect(${JSON.stringify(screen.id)})`, { prelude: builtInPrelude(), dryRun: true });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.result, plain);
  assert.equal(r.dryRun.counts.set + r.dryRun.counts.call + r.dryRun.counts.remove, 0);
  assert.deepEqual(mock.snapshot(), before);
});

test('find: names and text content on every page, type and page filters, limit with "… N more"', async () => {
  const { mock, figma, screen } = await createScreen();
  const rows = await runHelper(mock, 'find("row")');
  assert.equal(rows.split('\n').length, 8);
  assert.ok(rows.length <= 8 * 40, rows.length + ' characters for 8 matches');
  assert.match(rows.split('\n')[0], new RegExp('^\\S+ FRAME "Row 1" · Screens › Inbox$'));
  // Text content matches too; the layer name alone would not.
  assert.match(await runHelper(mock, 'find("number 3")'), /^\S+ TEXT "Preview" text="A longer preview line of message number 3 that runs past th…" · Screens › Inbox$/);
  const labels = await runHelper(mock, 'find("/^(ok|later)$/i", { type: "TEXT" })');
  assert.ok(labels.split('\n').every(l => / TEXT "Label" text="(OK|Later)" · /.test(l)), labels);
  assert.match(labels, / · Components › Button/);
  assert.match(labels, / · Screens › Inbox/);
  assert.equal(await runHelper(mock, 'find("Button", { type: "COMPONENT_SET" })').then(s => s.split(' ').slice(1).join(' ')), 'COMPONENT_SET "Button" · Components');
  assert.equal((await runHelper(mock, 'find("button", { page: "Screens", type: "INSTANCE" })')).split('\n').length, 2);
  const capped = await runHelper(mock, 'find("e", { limit: 3 })');
  assert.equal(capped.split('\n').length, 4);
  assert.match(capped, /\n… \d+ more \(limit 3\)$/);
  assert.equal(await runHelper(mock, 'find("zzz")'), 'no match for "zzz"');
  await assert.rejects(runHelper(mock, 'find("a", { page: "Nope" })'), /find: no page "Nope" \(pages: Screens, Components\)/);
  assert.equal(figma.skipInvisibleInstanceChildren, false);
  assert.ok(screen); // the search left the current page alone
  assert.equal(figma.currentPage.name, 'Screens');
});

test('library: variables per collection and mode, aliases by name, one value when modes agree', async () => {
  const { mock } = await createScreen();
  assert.equal(await runHelper(mock, 'library("variables")'), [
    'Tokens [Light|Dark] 5',
    '  palette/blue #0057D0',
    '  color/surface #FFFFFF | #121213',
    '  color/accent →palette/blue',
    '  space/md 12',
    '  copy/title "Inbox"',
  ].join('\n'));
  assert.equal(await runHelper(mock, 'library("variables", { filter: "/^color\\\\//" })'), 'Tokens [Light|Dark] 2\n  color/surface #FFFFFF | #121213\n  color/accent →palette/blue');
  assert.equal(await runHelper(mock, 'library("variables", { filter: "nope" })'), 'no local variables matching nope');
});

test('library: styles with their values, components with variant axes, properties and defaults', async () => {
  const { mock } = await createScreen();
  assert.equal(await runHelper(mock, 'library("styles")'), [
    'TEXT 2', '  Body/M Inter/Regular/15 lh20', '  Heading/L Inter/Bold/28 ls-1%',
    'PAINT 1', '  Border/Subtle #0000001F',
    'EFFECT 1', '  Elevation/1 shadow(0,2,8,#00000033)',
  ].join('\n'));
  assert.match(await runHelper(mock, 'library("components")'), /^Components 1\n {2}\S+ SET "Button" \{Kind=Primary\|Secondary,Label:text="OK"\} — Main actions\.$/);
  const fx = await createFixture();
  assert.match(await runHelper(fx.mock, 'library("components", { filter: "icon" })'), /^Components 1\n {2}\S+ "Icon"$/);
  await assert.rejects(runHelper(fx.mock, 'library("colors")'), /library: kind is variables, styles or components, not colors/);
});

test('library: long lists stop at the limit with "… N more"', async () => {
  const mock = createFigma();
  const c = mock.figma.variables.createVariableCollection('Big');
  for (let i = 0; i < 40; i++) mock.figma.variables.createVariable('size/' + i, c, 'FLOAT').setValueForMode(c.defaultModeId, i);
  const out = await runHelper(mock, 'library("variables", { limit: 10 })');
  assert.equal(out.split('\n').length, 11);
  assert.match(out, /\n… 31 more \(use filter\)$/);
  const full = await runHelper(mock, 'library("variables")');
  assert.ok(full.length <= 41 * 16, full.length + ' characters for 40 variables');
});
