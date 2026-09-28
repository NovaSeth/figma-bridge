import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDesignMd, loadDesignMdConfig } from '../tools/export-design-md.mjs';
import { root } from './harness.mjs';

const data = {
  colors: { primary: { value: '#0B57D0', description: 'Accent', css: 'var(--primary)' } },
  colorsDark: { primary: { value: '#8AB4F8' } },
  spacing: { lg: { value: 16 }, sm: { value: 8 } },
  rounded: { full: { value: 999 }, md: { value: 12 } },
  typography: [{ name: 'title/md', fontFamily: 'Inter', style: 'Semi Bold', fontSize: 17, lineHeight: 130, letterSpacing: 0, description: 'Titles' }],
  elevation: [{ name: 'elevation/fab', layers: [{ x: 0, y: 4, blur: 12, alpha: 0.2 }] }],
  components: [{ name: 'Chip', variants: ['Size=Small', 'Size=Large'], properties: ['Label'], description: 'Filter.' }, { name: 'Badge', variants: [], properties: [], description: 'Count.' }],
  icons: ['check', 'close'],
};

test('without a config the document uses generic English prose and lists every component', () => {
  const md = buildDesignMd(data);
  assert.match(md, /^---\nversion: alpha\nname: Design system\ndescription: "Design tokens and components exported from Figma\."\n/);
  assert.match(md, /\| Token \| Light \| Dark \| CSS variable \| Role \|\n\|---\|---\|---\|---\|---\|\n\| `primary` \| `#0B57D0` \| `#8AB4F8` \| `--primary` \| Accent \|/);
  assert.match(md, /spacing:\n {2}"sm": 8px\n {2}"lg": 16px/);            // sorted by value
  assert.match(md, /\| `rounded\.md` \| 12 px \| {2}\|\n\| `rounded\.full` \| 999 px \| {2}\|/);
  assert.match(md, /\*\*Chip\*\* \(Size=Small · Size=Large\)\. Filter\. Properties: Label\.\n\n\*\*Badge\*\*\. Count\./);
  assert.match(md, /\*\*Icon\.\*\* 2 icon components: `check`, `close`\./);
  assert.doesNotMatch(md, /^components:/m);                               // no token map, no YAML block
  assert.doesNotMatch(md, /Do's and Don'ts|### /);
});

test('config supplies prose, headers, usage, groups and the component token map', () => {
  const md = buildDesignMd(data, {
    name: 'Acme: mobile', description: 'D', overview: 'One.\n\nTwo.',
    colors: { intro: 'Colors intro.', columns: ['T', 'L', 'D', 'C', 'R'], outro: 'Colors outro.' },
    elevation: { usage: { 'elevation/fab': 'Floating button' } },
    shapes: { columns: ['T', 'V', 'W'], usage: { full: 'Avatars', md: 'Buttons', missing: 'skipped' } },
    components: { intro: 'Atoms first.', groups: { Atoms: ['Badge', 'Chip'] }, propertiesLabel: 'Props', icons: '**Icon.** {{count}}: {{list}}.' },
    dosAndDonts: '**Do**\n\n- one',
  }, { chip: { backgroundColor: '{colors.primary}', typography: '{typography.title/md}' } });
  assert.match(md, /^name: "Acme: mobile"$/m);
  assert.match(md, /## Overview\n\nOne\.\n\nTwo\.\n\n## Colors\n\nColors intro\.\n\n\| T \| L \| D \| C \| R \|[\s\S]*\n\nColors outro\.\n\n## Typography/);
  assert.match(md, /\| `elevation\/fab` \| 0 4px 12px rgba\(0,0,0,0\.2\) \| Floating button \|/);
  assert.match(md, /\| `rounded\.full` \| 999 px \| Avatars \|\n\| `rounded\.md` \| 12 px \| Buttons \|\n\n/);   // config order, unknown keys dropped
  assert.match(md, /## Components\n\nAtoms first\.\n\n### Atoms\n\n\*\*Badge\*\*\. Count\.\n\n\*\*Chip\*\*[^\n]* Props: Label\.\n\n\*\*Icon\.\*\* 2: `check`, `close`\.\n\n## Do's and Don'ts\n\n\*\*Do\*\*\n\n- one\n$/);
  assert.match(md, /components:\n {2}chip:\n {4}backgroundColor: "\{colors\.primary\}"\n {4}typography: "\{typography\.title-md\}"/);
});

test('config: none gives defaults, a file brings componentTokens from next to it, a broken one names itself', () => {
  const dir = mkdtempSync(join(tmpdir(), 'design-md-'));
  assert.deepEqual(loadDesignMdConfig(null), { config: {}, componentTokens: {} });
  mkdirSync(join(dir, 'project'));
  writeFileSync(join(dir, 'project', 'design.json'), JSON.stringify({ name: 'P', componentTokens: 'tokens.json' }));
  writeFileSync(join(dir, 'project', 'tokens.json'), JSON.stringify({ chip: { rounded: '{rounded.md}' } }));
  assert.deepEqual(loadDesignMdConfig(join(dir, 'project', 'design.json')), { config: { name: 'P', componentTokens: 'tokens.json' }, componentTokens: { chip: { rounded: '{rounded.md}' } } });
  writeFileSync(join(dir, 'project', 'design.json'), '{');
  assert.throws(() => loadDesignMdConfig(join(dir, 'project', 'design.json')), /designMd .*design\.json/);
  rmSync(dir, { recursive: true, force: true });
});

test('CLI: --project takes the designMd of a local project, --config any file; input and output default to <data>/out', () => {
  const home = mkdtempSync(join(tmpdir(), 'design-md-home-'));
  const env = { ...process.env, BRIDGE_HOME: home };
  const project = join(home, 'projects', 'demo');
  mkdirSync(project, { recursive: true });
  mkdirSync(join(home, 'data', 'out'), { recursive: true });
  writeFileSync(join(project, 'project.json'), JSON.stringify({ name: 'demo', designMd: 'design.json' }));
  writeFileSync(join(project, 'design.json'), JSON.stringify({ name: 'Demo system' }));
  writeFileSync(join(home, 'data', 'out', 'ds-export.json'), JSON.stringify({ ok: true, result: data }));
  const cli = (...args) => execFileSync(process.execPath, [join(root, 'tools', 'export-design-md.mjs'), ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  cli('--project', 'demo');
  assert.match(readFileSync(join(home, 'data', 'out', 'DESIGN.md'), 'utf8'), /^name: Demo system$/m);
  writeFileSync(join(home, 'other.json'), JSON.stringify({ name: 'Other' }));
  cli('--config', join(home, 'other.json'), '--input', join(home, 'data', 'out', 'ds-export.json'), join(home, 'custom.md'));
  assert.match(readFileSync(join(home, 'custom.md'), 'utf8'), /^name: Other$/m);
  assert.throws(() => cli('--project', 'nope'), e => /no project "nope"/.test(e.stderr) && e.status === 1);
  rmSync(home, { recursive: true, force: true });
});
