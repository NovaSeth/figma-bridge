// Builds DESIGN.md (the Stitch / google-labs-code/design.md format) from design-system data read out of Figma.
// Usage: node run.mjs <export job> > <data>/out/ds-export.json
//        node tools/export-design-md.mjs [--project <name> | --config <file>] [--input <file>] [output]
// <data> is the bridge's data directory (paths.mjs); input and output default to <data>/out/ds-export.json and
// <data>/out/DESIGN.md.
//
// Input: the run.mjs output (or the bare result) of a job returning
//   { colors: { name: { value: '#RRGGBB', description, css } }, colorsDark?: { …same keys },
//     spacing: { name: { value } }, rounded: { name: { value } },
//     typography: [{ name, fontFamily, style, fontSize, lineHeight (%), letterSpacing (%), description }],
//     elevation: [{ name, layers: [{ x, y, blur, alpha }] }],
//     components: [{ name, variants: [], properties: [], description }], icons: [name] }
// Such a job belongs to a project (its page, collection and prefix names are the project's), not to the bridge.
//
// Prose (name, description, section texts, table headers, component groups) comes from a design-md config: the
// "designMd" of a local project (--project) or any file (--config); without one the document gets generic
// English defaults. Paths inside that config are relative to the config file.
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDir } from '../paths.mjs';
import { projectFiles, selectProject } from '../project.mjs';

const WEIGHT = { Thin: 100, 'Extra Light': 200, Light: 300, Regular: 400, Medium: 500, 'Semi Bold': 600, Bold: 700, 'Extra Bold': 800, Black: 900 };
const DEFAULTS = {
  name: 'Design system',
  description: 'Design tokens and components exported from Figma.',
  overview: 'Exported from the local variables, text and effect styles and components of the Figma file.',
  colors: { columns: ['Token', 'Light', 'Dark', 'CSS variable', 'Role'] },
  typography: { columns: ['Style (DESIGN.md / Figma)', 'Size / line height', 'Weight', 'Usage'] },
  layout: { columns: ['Token', 'Value'] },
  elevation: { columns: ['Style', 'Layers', 'Usage'] },
  shapes: { columns: ['Token', 'Value', 'Usage'] },
  components: { propertiesLabel: 'Properties', icons: '**Icon.** {{count}} icon components: {{list}}.' },
};

const q = s => JSON.stringify(String(s));
const flat = s => String(s).replace(/\//g, '-');            // Tailwind and DTCG reject slashes; Figma keeps them as groups
const flatRefs = s => String(s).replace(/\{typography\.([^}]+)\}/g, (_, n) => '{typography.' + flat(n) + '}');
const byValue = obj => Object.entries(obj || {}).sort((a, b) => a[1].value - b[1].value);
const table = (head, rows) => !rows.length ? null
  : ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|', ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n');
// "## Title", then intro, table and outro, each followed by a blank line; nothing when all three are empty.
const section = (title, { intro, outro } = {}, tbl = null) => {
  const parts = [intro, tbl, outro].filter(Boolean);
  return parts.length ? ['## ' + title, '', ...parts.flatMap(p => [p, ''])] : [];
};

export function buildDesignMd(d, config = {}, componentTokens = {}) {
  const c = key => ({ ...DEFAULTS[key], ...config[key] });
  const name = config.name || DEFAULTS.name;
  const y = ['---', 'version: alpha', 'name: ' + (/^[\w .-]+$/.test(name) ? name : q(name)), 'description: ' + q(config.description || DEFAULTS.description)];
  y.push('colors:'); for (const [k, v] of Object.entries(d.colors || {})) y.push(`  ${k}: ${q(v.value)}`);
  y.push('typography:'); for (const t of d.typography || []) { y.push(`  ${flat(t.name)}:`, `    fontFamily: ${t.fontFamily}`, `    fontSize: ${t.fontSize}px`, `    fontWeight: ${WEIGHT[t.style] || 400}`, `    lineHeight: ${Math.round(t.lineHeight) / 100}`); if (t.letterSpacing) y.push(`    letterSpacing: ${Math.round(t.letterSpacing * 10) / 1000}em`); }
  y.push('rounded:'); for (const [k, v] of byValue(d.rounded)) y.push(`  ${q(k)}: ${v.value}px`);
  y.push('spacing:'); for (const [k, v] of byValue(d.spacing)) y.push(`  ${q(k)}: ${v.value}px`);
  if (Object.keys(componentTokens).length) { y.push('components:'); for (const [n, props] of Object.entries(componentTokens)) { y.push(`  ${n}:`); for (const [k, v] of Object.entries(props)) y.push(`    ${k}: ${q(flatRefs(v))}`); } }
  y.push('---', '');

  const dark = d.colorsDark || {}, comps = d.components || [], icons = d.icons || [];
  const b = [...section('Overview', { intro: config.overview || DEFAULTS.overview })];
  const colors = c('colors'), typography = c('typography'), layout = c('layout'), elevation = c('elevation'), shapes = c('shapes'), components = c('components');
  b.push(...section('Colors', colors, table(colors.columns, Object.entries(d.colors || {}).map(([k, v]) =>
    ['`' + k + '`', '`' + v.value + '`', '`' + (dark[k] ? dark[k].value : '') + '`', '`' + (v.css || '').replace(/^var\(|\)$/g, '') + '`', v.description || '']))));
  b.push(...section('Typography', typography, table(typography.columns, (d.typography || []).map(t =>
    ['`' + flat(t.name) + '` / `' + t.name + '`', t.fontSize + ' px / ' + Math.round(t.lineHeight) + '%', String(WEIGHT[t.style] || 400), t.description || '']))));
  b.push(...section('Layout', layout, table(layout.columns, byValue(d.spacing).map(([k, v]) => ['`spacing.' + k + '`', v.value + ' px']))));
  b.push(...section('Elevation & Depth', elevation, table(elevation.columns, (d.elevation || []).map(e =>
    ['`' + e.name + '`', e.layers.map(l => `0 ${l.y}px ${l.blur}px rgba(0,0,0,${l.alpha})`).join(', '), (elevation.usage || {})[e.name] || '']))));
  // Configured usage lists the shapes worth explaining, in its own order; otherwise every radius by size.
  const radii = shapes.usage ? Object.keys(shapes.usage).filter(k => d.rounded && d.rounded[k]) : byValue(d.rounded).map(([k]) => k);
  b.push(...section('Shapes', shapes, table(shapes.columns, radii.map(k => ['`rounded.' + k + '`', d.rounded[k].value + ' px', (shapes.usage || {})[k] || '']))));

  const describe = n => {
    const { variants = [], properties = [], description = '' } = comps.find(k => k.name === n) || {};
    return '**' + n + '**' + (variants.length ? ' (' + variants.join(' · ') + ')' : '') + '. ' + description + (properties.length ? ' ' + components.propertiesLabel + ': ' + properties.join(', ') + '.' : '');
  };
  const groups = components.groups ? Object.entries(components.groups) : [[null, comps.map(k => k.name)]];
  const list = groups.flatMap(([g, names]) => [...(g ? ['### ' + g, ''] : []), ...names.flatMap(n => [describe(n), ''])]);
  if (icons.length) list.push(components.icons.replace('{{count}}', icons.length).replace('{{list}}', () => icons.map(i => '`' + i + '`').join(', ')), '');
  if (components.intro || list.length) b.push('## Components', '', ...(components.intro ? [components.intro, ''] : []), ...list);
  if (config.dosAndDonts) b.push("## Do's and Don'ts", '', config.dosAndDonts, '');
  return y.join('\n') + b.join('\n');
}

const readJson = (file, what) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${what} (${file}): ${e.message}`); } };
// file = a design-md config or null (generic defaults); its componentTokens path is relative to it.
export function loadDesignMdConfig(file) {
  if (!file) return { config: {}, componentTokens: {} };
  const config = readJson(file, 'designMd');
  const componentTokens = config.componentTokens ? readJson(resolve(dirname(file), config.componentTokens), 'componentTokens') : {};
  return { config, componentTokens };
}
// --config wins; --project uses that project's "designMd" (none → defaults).
export const designMdFile = ({ project = null, config = null } = {}) =>
  config ? resolve(config) : project ? projectFiles(selectProject({ name: project })).designMd : null;

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opts = { project: null, config: null, input: join(dataDir(), 'out', 'ds-export.json'), output: join(dataDir(), 'out', 'DESIGN.md') };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const key = { '--project': 'project', '--config': 'config', '--input': 'input' }[argv[i]];
    if (key && i + 1 < argv.length) opts[key] = argv[++i];
    else if (argv[i].startsWith('--')) { console.error('usage: node tools/export-design-md.mjs [--project <name> | --config <file>] [--input <file>] [output]'); process.exit(2); }
    else opts.output = resolve(argv[i]);
  }
  try {
    const raw = readJson(resolve(opts.input), 'input');
    if (raw.ok === false) throw new Error(opts.input + ' holds a failed job: ' + raw.error);
    const { config, componentTokens } = loadDesignMdConfig(designMdFile(opts));
    writeFileSync(opts.output, buildDesignMd(raw.result || raw, config, componentTokens));
    console.log('zapisano', opts.output);
  } catch (e) { console.error(e.message); process.exit(1); }
}
