// Built-in prelude: helpers every bridge job gets without declaring them (node run.mjs sends it, the plugin
// runs it in a scope around the job, so a job's own `const hex = …` shadows a helper instead of clashing).
// Definitions only: nothing here touches the document until a helper is called.
// Runs in the plugin sandbox: no optional chaining, no object spread. Must not `return` (it would skip the job).

// '#RRGGBB', 'RRGGBB', '#RGB' (alpha digits ignored) → { r, g, b } in 0..1
const hex = h => {
  let s = String(h).replace(/^#/, '');
  if (s.length === 3 || s.length === 4) s = s.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s)) throw new Error('hex: not a colour: ' + h);
  return { r: parseInt(s.slice(0, 2), 16) / 255, g: parseInt(s.slice(2, 4), 16) / 255, b: parseInt(s.slice(4, 6), 16) / 255 };
};

// Paint list for fills/strokes: solid('#0B57D0'), solid('#000', 0.5), solid({ r, g, b })
const solid = (color, opacity) => {
  const paint = { type: 'SOLID', color: typeof color === 'string' ? hex(color) : color };
  if (opacity != null) paint.opacity = opacity;
  return [paint];
};

// A long scan pauses now and then so Figma stays responsive. code.js hands breathe to every job; a plugin window
// opened before it did has none, and the helpers must still run there.
const _breathe = typeof breathe === 'function' ? breathe : async () => {};

// Finds a page by exact name or RegExp, makes it current (which loads it) and returns it.
const usePage = async (match, { create = false } = {}) => {
  // a /g or /y pattern remembers where it stopped and would miss the page every other time
  const re = typeof match === 'string' ? null : new RegExp(match.source, match.flags.replace(/[gy]/g, ''));
  let page = figma.root.children.find(p => (re ? re.test(p.name) : p.name === match));
  if (!page && create) {
    if (typeof match !== 'string') throw new Error('usePage: a new page needs a string name, got ' + match);
    page = figma.createPage();
    page.name = match;
  }
  if (!page) throw new Error('usePage: no page ' + match + ' (pages: ' + figma.root.children.map(p => p.name).join(', ') + ')');
  await figma.setCurrentPageAsync(page);
  return page;
};

// The node and everything under it. findAll() alone never returns the node itself, which is how an audit
// can report "0 problems" while the screen's own background is wrong.
const all = node => [node].concat('findAll' in node ? node.findAll() : []);
const texts = node => (node.type === 'TEXT' ? [node] : []).concat('findAllWithCriteria' in node ? node.findAllWithCriteria({ types: ['TEXT'] }) : []);

// match: exact name, RegExp on the name, or a predicate. Searches below root (root itself excluded, like findAll).
const _matcher = match => {
  if (typeof match === 'function') return match;
  if (match instanceof RegExp) { const re = new RegExp(match.source, match.flags.replace(/[gy]/g, '')); return n => re.test(n.name); }
  return n => n.name === match;
};
const byName = (match, root = figma.currentPage) => root.findAll(_matcher(match));
const one = (match, root = figma.currentPage) => root.findOne(_matcher(match));

// Loads every font used by the text in the subtree(s), mixed-font text included. Returns the fonts.
const loadFonts = async nodes => {
  const fonts = new Map();
  for (const node of [].concat(nodes)) {
    for (const t of texts(node)) {
      const used = t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName];
      for (const f of used) fonts.set(f.family + '\u0000' + f.style, f);
    }
  }
  const list = Array.from(fonts.values());
  await Promise.all(list.map(f => figma.loadFontAsync(f)));
  return list;
};

// Local variable by name, optionally within a named collection; null when missing. The list is read once per
// job and read again on a miss, so a variable the job just created is found too.
let _variables = null;
const variable = async (name, collectionName) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const cached = !!_variables && !attempt;
    if (!cached) {
      const lists = await Promise.all([figma.variables.getLocalVariablesAsync(), figma.variables.getLocalVariableCollectionsAsync()]);
      _variables = { vars: lists[0], collections: lists[1] };
    }
    const collection = collectionName == null ? null : _variables.collections.find(c => c.name === collectionName);
    const found = (collectionName == null || collection) && _variables.vars.find(v => v.name === name && (!collection || v.variableCollectionId === collection.id));
    if (found) return found;
    if (!cached) break; // the lists were just read: reading them again finds nothing new
  }
  return null;
};

// [SolidPaint] bound to a COLOR variable, for fills/strokes.
const paintVar = async nameOrVariable => {
  const v = typeof nameOrVariable === 'string' ? await variable(nameOrVariable) : nameOrVariable;
  if (!v) throw new Error('paintVar: no variable ' + nameOrVariable);
  if (v.resolvedType !== 'COLOR') throw new Error('paintVar: ' + v.name + ' is ' + v.resolvedType + ', not COLOR');
  return [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)];
};

// Local COMPONENT or COMPONENT_SET by name, on any page (loads all pages once); null when missing.
let _components = null;
const component = async name => {
  const find = () => _components.find(c => !c.removed && c.name === name) || null;
  const hit = _components && find();
  if (hit) return hit;
  await figma.loadAllPagesAsync();
  _components = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
  return find();
};

// Instance of a component, or of a variant: instance('Button', 'Size=Small, State=On') or
// instance('Button', { Size: 'Small' }); unspecified properties keep the default variant's values.
const instance = async (name, variant) => {
  const c = await component(name);
  if (!c) throw new Error('instance: no component ' + name);
  if (c.type !== 'COMPONENT_SET') return c.createInstance();
  if (variant == null) return c.defaultVariant.createInstance();
  let want = variant;
  if (typeof variant === 'string') {
    want = {};
    for (const pair of variant.split(',')) { const kv = pair.split('='); if (kv.length === 2) want[kv[0].trim()] = kv[1].trim(); }
  }
  const keys = Object.keys(want), base = c.defaultVariant.variantProperties;
  const fits = c.children.filter(v => keys.every(k => v.variantProperties[k] === String(want[k])));
  const pick = fits.find(v => Object.keys(base).every(k => keys.indexOf(k) >= 0 || v.variantProperties[k] === base[k])) || fits[0];
  if (!pick) throw new Error('instance: ' + name + ' has no variant ' + JSON.stringify(want) + ' (variants: ' + c.children.map(v => v.name).join(' | ') + ')');
  return pick.createInstance();
};

// Sets a component property by its short name: 'Label' finds 'Label#12:3'. Throws on an unknown name
// instead of letting the instance keep its default text silently. A TEXT property writes into the bound text
// layer, so load its font first: await loadFonts(inst).
const setProp = (inst, name, value) => {
  const keys = Object.keys(inst.componentProperties);
  const short = k => (k.lastIndexOf('#') > 0 ? k.slice(0, k.lastIndexOf('#')) : k);
  const key = keys.find(k => k === name) || keys.find(k => short(k) === name);
  if (!key) throw new Error('setProp: ' + inst.name + ' has no property ' + name + ' (has: ' + keys.map(short).join(', ') + ')');
  const values = {};
  values[key] = value;
  inst.setProperties(values);
  return inst;
};

// clone() of a variant loses componentPropertyReferences, so instances of the copy silently ignore
// setProperties. This clones into the set and binds the references again, layer by layer.
const cloneVariant = (set, source, name) => {
  const copy = source.clone();
  set.appendChild(copy);
  copy.name = name;
  const relink = (from, to) => {
    const refs = from.componentPropertyReferences;
    if (refs && Object.keys(refs).length) to.componentPropertyReferences = refs;
    if (from.type !== 'INSTANCE' && 'children' in from) from.children.forEach((c, i) => relink(c, to.children[i]));
  };
  source.children.forEach((c, i) => relink(c, copy.children[i]));
  return copy;
};

// Auto-layout frame that hugs its content and has no fill; props are assigned last (they win).
const frame = (name, direction = 'VERTICAL', props = {}) => {
  const f = figma.createFrame();
  f.name = name;
  f.fills = [];
  f.layoutMode = direction;
  if (direction !== 'NONE') { f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; }
  return Object.assign(f, props);
};

// Text node with its font loaded: await text('Hi', { style: 'Bold', size: 17, fill: '#111113' })
const text = async (chars, { family = 'Inter', style = 'Regular', size, fill } = {}) => {
  const font = { family, style };
  await figma.loadFontAsync(font);
  const t = figma.createText();
  t.fontName = font;
  if (size) t.fontSize = size;
  t.characters = String(chars);
  if (fill) t.fills = typeof fill === 'string' ? solid(fill) : fill;
  return t;
};

// ---- Knowledge: compact text about the file, for jobs and for the MCP tools figma_inspect, figma_find and
// figma_library. One line per node or token and every list capped with an explicit "… N more", because the
// text lands in a model's context. Async lookups (variables, styles, main components) are cached per call:
// a screen binds the same few variables hundreds of times.

const _clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const _str = (s, n) => JSON.stringify(_clip(String(s), n || 60));
const _n = v => Math.round(v * 10) / 10;
// Some getters throw for some node kinds (or a missing main component); a missing detail beats a failed outline.
const _get = (o, key) => { try { return o[key]; } catch (e) { return undefined; } };
// { r, g, b[, a] } and a paint opacity → #RRGGBB, or #RRGGBBAA when not opaque
const _hex = (c, opacity) => {
  const h = x => ('0' + Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16)).slice(-2).toUpperCase();
  const a = (c.a == null ? 1 : c.a) * (opacity == null ? 1 : opacity);
  return '#' + h(c.r) + h(c.g) + h(c.b) + (a < 1 ? h(a) : '');
};
// '/re/flags' or a RegExp → that pattern; any other text → case-insensitive substring
const _pattern = q => {
  if (q instanceof RegExp) return new RegExp(q.source, q.flags.replace(/[gy]/g, ''));
  const m = /^\/(.+)\/([a-z]*)$/.exec(String(q));
  if (m) return new RegExp(m[1], m[2].replace(/[gy]/g, ''));
  const needle = String(q).toLowerCase();
  return { test: s => String(s).toLowerCase().indexOf(needle) >= 0 };
};
const _lookups = () => {
  const cache = new Map();
  const once = (key, load) => { if (!cache.has(key)) cache.set(key, Promise.resolve().then(load).catch(() => null)); return cache.get(key); };
  return {
    variable: id => once('v' + id, () => figma.variables.getVariableByIdAsync(id)),
    style: id => once('s' + id, () => figma.getStyleByIdAsync(id)),
    node: id => once('n' + id, () => figma.getNodeByIdAsync(id)),
    defs: comp => once('d' + comp.id, () => comp.componentPropertyDefinitions),
    // dynamic-page files refuse the sync mainComponent getter
    main: inst => Promise.resolve().then(() => (typeof inst.getMainComponentAsync === 'function' ? inst.getMainComponentAsync() : inst.mainComponent)).catch(() => null),
  };
};

// A number, or the name of the variable bound to it.
const _val = async (bound, field, value, L) => {
  const alias = bound && bound[field], v = alias && alias.id ? await L.variable(alias.id) : null;
  return v ? v.name : _n(value || 0);
};
// [top, right, bottom, left] → p16, p16/12 (vertical/horizontal) or p1/2/3/4; variable names: p=space/md,space/sm
const _padding = p => {
  if (p.every(v => v === 0)) return null;
  const list = p[0] === p[2] && p[1] === p[3] ? (p[0] === p[1] ? [p[0]] : [p[0], p[1]]) : p;
  return list.some(v => typeof v === 'string') ? 'p=' + list.join(',') : 'p' + list.join('/');
};
const _paints = async (paints, L) => {
  if (paints === figma.mixed) return 'mixed';
  const out = [];
  for (const p of paints || []) {
    if (p.visible === false) continue;
    if (p.type !== 'SOLID') { out.push(p.type.replace('GRADIENT_', 'gradient-').toLowerCase()); continue; }
    const alias = p.boundVariables && p.boundVariables.color, v = alias ? await L.variable(alias.id) : null;
    out.push(v ? v.name + (p.opacity != null && p.opacity < 1 ? '@' + Math.round(p.opacity * 100) + '%' : '') : _hex(p.color, p.opacity));
  }
  return out.join(',');
};
// A style names the intent better than the paint it holds.
const _paintOf = async (node, field, styleField, L) => {
  const id = _get(node, styleField), style = typeof id === 'string' && id ? await L.style(id) : null;
  return style ? 'style:' + style.name : _paints(_get(node, field), L);
};
const _effects = effects => (effects || []).filter(e => e.visible !== false).map(e => {
  if (!/SHADOW/.test(e.type)) return (e.type === 'LAYER_BLUR' ? 'blur' : 'bg-blur') + '(' + _n(e.radius) + ')';
  const nums = [e.offset.x, e.offset.y, e.radius].concat(e.spread ? [e.spread] : []).map(_n);
  return (e.type === 'DROP_SHADOW' ? 'shadow' : 'inner-shadow') + '(' + nums.join(',') + ',' + _hex(e.color) + ')';
}).join(',');
const _grids = grids => (grids || []).map(g => (g.pattern === 'GRID' ? 'grid(' + g.sectionSize
  : (g.pattern === 'COLUMNS' ? 'cols(' : 'rows(') + g.count + ',gutter' + g.gutterSize) + ')').join(',');
// Inter/Bold/17 lh24 ls-1%, from a text node or a text style
const _type = src => {
  const f = _get(src, 'fontName'), size = _get(src, 'fontSize');
  if (f === figma.mixed || size === figma.mixed) return 'font=mixed';
  if (!f) return null;
  const out = [f.family + '/' + f.style + '/' + _n(size)], lh = _get(src, 'lineHeight'), ls = _get(src, 'letterSpacing');
  if (lh && lh !== figma.mixed && lh.unit !== 'AUTO') out.push('lh' + _n(lh.value) + (lh.unit === 'PERCENT' ? '%' : ''));
  if (ls && ls !== figma.mixed && ls.value) out.push('ls' + _n(ls.value) + (ls.unit === 'PERCENT' ? '%' : 'px'));
  return out.join(' ');
};
// Component property definitions: Size=Large|Small,Label:text="Go",Icon:bool=true,Slot:swap
const _short = k => (k.lastIndexOf('#') > 0 ? k.slice(0, k.lastIndexOf('#')) : k);
const _defs = (defs, withDefaults) => Object.keys(defs || {}).map(k => {
  const d = defs[k], name = _short(k);
  if (d.type === 'VARIANT') return name + '=' + (d.variantOptions || []).join('|');
  const type = d.type === 'BOOLEAN' ? 'bool' : d.type === 'INSTANCE_SWAP' ? 'swap' : d.type.toLowerCase();
  return name + ':' + type + (withDefaults && d.type !== 'INSTANCE_SWAP' ? '=' + (typeof d.defaultValue === 'string' ? _str(d.defaultValue, 30) : d.defaultValue) : '');
}).join(',');

const _AUTO = { HORIZONTAL: 'H', VERTICAL: 'V', GRID: 'GRID' };
const _ALIGN = { CENTER: 'center', MAX: 'end', BASELINE: 'baseline' }; // MIN (start) is the default, not worth a word
// FRAME "Card" 1:2 343×120 @0,0 V gap12 p16/12 hug×fill fill=color/surface r12 hidden
const _line = async (node, L, parent) => {
  const t = node.type, bits = [t, _str(node.name), node.id], bound = _get(node, 'boundVariables') || {};
  const put = s => { if (s) bits.push(s); };
  const w = _get(node, 'width');
  if (typeof w === 'number') {
    put(_n(w) + '×' + _n(node.height));
    // Position only where it is chosen, not computed by an auto-layout parent.
    const absolute = _get(node, 'layoutPositioning') === 'ABSOLUTE';
    if (absolute || !(parent && (_AUTO[_get(parent, 'layoutMode')] || parent.type === 'COMPONENT_SET'))) put((absolute ? 'abs@' : '@') + _n(node.x) + ',' + _n(node.y));
  }
  const mode = _AUTO[_get(node, 'layoutMode')];
  if (mode) {
    put(mode);
    if (_get(node, 'layoutWrap') === 'WRAP') put('wrap');
    const main = _get(node, 'primaryAxisAlignItems'), cross = _get(node, 'counterAxisAlignItems');
    const gap = main === 'SPACE_BETWEEN' ? 'auto' : await _val(bound, 'itemSpacing', _get(node, 'itemSpacing'), L);
    if (gap) put(typeof gap === 'string' ? 'gap=' + gap : 'gap' + gap);
    const pad = [];
    for (const side of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) pad.push(await _val(bound, side, _get(node, side), L));
    put(_padding(pad));
    if (_ALIGN[main]) put('justify=' + _ALIGN[main]);
    if (_ALIGN[cross]) put('align=' + _ALIGN[cross]);
  }
  if (t === 'TEXT') {
    const chars = _get(node, 'characters') || '', styleId = _get(node, 'textStyleId');
    if (chars !== node.name) put('text=' + _str(chars));
    const style = typeof styleId === 'string' && styleId ? await L.style(styleId) : null;
    put(style ? 'style:' + style.name : styleId === figma.mixed ? 'style=mixed' : _type(node));
  }
  const sx = _get(node, 'layoutSizingHorizontal'), sy = _get(node, 'layoutSizingVertical');
  if (sx && sy && (sx !== 'FIXED' || sy !== 'FIXED')) put(sx.toLowerCase() + '×' + sy.toLowerCase());
  if (t !== 'PAGE' && t !== 'DOCUMENT') {
    const fill = await _paintOf(node, 'fills', 'fillStyleId', L), stroke = await _paintOf(node, 'strokes', 'strokeStyleId', L);
    if (fill) put('fill=' + fill);
    if (stroke) {
      put('stroke=' + stroke);
      const sw = _get(node, 'strokeWeight');
      put(sw === figma.mixed ? 'sw=mixed' : typeof sw === 'number' && sw !== 1 ? 'sw' + _n(sw) : null);
    }
    const r = _get(node, 'cornerRadius');
    if (r === figma.mixed) put('r' + ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'].map(k => _n(_get(node, k) || 0)).join('/'));
    else if (r) { const rv = await _val(bound, 'topLeftRadius', r, L); put(typeof rv === 'string' ? 'r=' + rv : 'r' + rv); }
    const fxId = _get(node, 'effectStyleId'), fxStyle = typeof fxId === 'string' && fxId ? await L.style(fxId) : null;
    const fx = fxStyle ? 'style:' + fxStyle.name : _effects(_get(node, 'effects'));
    if (fx) put('fx=' + fx);
    const op = _get(node, 'opacity'), rot = _get(node, 'rotation');
    if (typeof op === 'number' && op < 1) put('op' + Math.round(op * 100) + '%');
    if (rot) put('rot' + _n(rot));
  }
  if (t === 'INSTANCE') {
    const main = await L.main(node);
    if (main) {
      const set = main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent : null;
      const defs = (await L.defs(set || main)) || {}, props = _get(node, 'componentProperties') || {}, shown = [];
      // Variant values always; other properties only where they differ from the default (figma_library has those).
      for (const k of Object.keys(props)) {
        const p = props[k], d = defs[k];
        if (p.type !== 'VARIANT' && d && d.defaultValue === p.value) continue;
        let v = p.value;
        if (p.type === 'INSTANCE_SWAP') { const swapped = await L.node(v); if (swapped) v = swapped.name; }
        shown.push(_short(k) + '=' + (typeof v === 'string' && p.type !== 'VARIANT' ? _str(v, 30) : v));
      }
      put('→' + _str((set || main).name, 40) + (shown.length ? '{' + shown.join(',') + '}' : ''));
    }
  }
  if (t === 'COMPONENT_SET' || (t === 'COMPONENT' && !(parent && parent.type === 'COMPONENT_SET'))) {
    const defs = await L.defs(node);
    if (defs && Object.keys(defs).length) put('{' + _defs(defs, false) + '}');
  }
  if (_get(node, 'visible') === false) put('hidden');
  if (_get(node, 'locked') === true) put('locked');
  return bits.join(' ');
};

// Another page has to be loaded before its children can be read.
const _kids = async node => {
  if (!('children' in node)) return [];
  if (node.type === 'PAGE' && node !== figma.currentPage) await node.loadAsync();
  return node.children;
};
// target: "selection" | "page" | "file" | node id | name (a page, then a node on the current page, then on any
// page) | node | [nodes]  →  { nodes, note }
const _targets = async target => {
  if (target && typeof target === 'object') return { nodes: [].concat(target), note: '' };
  const t = target == null || target === '' ? 'selection' : String(target);
  if (t === 'selection') {
    const sel = figma.currentPage.selection;
    if (!sel.length) throw new Error('nothing selected in Figma; pass "page", a node id or a name');
    return { nodes: sel.slice(), note: '' };
  }
  if (t === 'page') return { nodes: [figma.currentPage], note: '' };
  if (t === 'file') return { nodes: [figma.root], note: '' };
  if (/^I?\d+:\d+(;\d+:\d+)*$/.test(t)) {
    const node = await figma.getNodeByIdAsync(t);
    if (!node) throw new Error('no node ' + t);
    for (let p = node.parent; p; p = p.parent) if (p.type === 'PAGE') { if (p !== figma.currentPage) await p.loadAsync(); break; }
    return { nodes: [node], note: '' };
  }
  const page = figma.root.children.find(p => p.name === t);
  if (page) return { nodes: [page], note: '' };
  const named = n => n.name === t;
  let hits = figma.currentPage.findAll(named);
  if (!hits.length) { await figma.loadAllPagesAsync(); hits = figma.root.findAll(named); }
  if (!hits.length) throw new Error('no node named ' + JSON.stringify(t) + ' (find() matches substrings)');
  const rest = hits.slice(1);
  return { nodes: [hits[0]], note: rest.length ? '\n(+' + rest.length + ' more named ' + JSON.stringify(t) + ': ' + rest.slice(0, 5).map(n => n.id).join(' ') + (rest.length > 5 ? ' …' : '') + ')' : '' };
};

// Outline, one line per node, `depth` levels below the target; [+N] = N children not shown. Instances are not
// opened below the target unless { instances: true }: their inside is the component's.
const inspect = async (target, opts) => {
  const o = opts || {}, depth = o.depth == null ? 3 : o.depth, maxLines = o.maxLines || 200;
  const found = await _targets(target), L = _lookups(), rows = [];
  let more = 0;
  const walk = async (node, level, parent) => {
    const row = rows.length < maxLines ? { node: node, level: level, parent: parent, cut: 0 } : null;
    if (row) rows.push(row); else more++;
    // past the limit only counted: no page loads for lines nobody sees
    const kids = row ? await _kids(node) : _get(node, 'children') || [];
    if (!kids.length) return;
    if (level >= depth || (node.type === 'INSTANCE' && level > 0 && !o.instances)) { if (row) row.cut = kids.length; return; }
    for (const c of kids) await walk(c, level + 1, node);
  };
  for (const node of found.nodes) await walk(node, 0, _get(node, 'parent'));
  const lines = [];
  for (const r of rows) {
    lines.push('  '.repeat(r.level) + (await _line(r.node, L, r.parent)) + (r.cut ? ' [+' + r.cut + ']' : ''));
    await _breathe();
  }
  return lines.join('\n') + (more ? '\n… ' + more + ' more (maxLines ' + maxLines + ')' : '') + found.note;
};

// Nodes whose name (or, for text, content) matches: case-insensitive substring or '/regex/'. All pages
// (loaded first) or opts.page; opts.type 'TEXT' or 'FRAME,INSTANCE'. One line per match:
// 1:23 TEXT "Title" text="Hello" · Page › top-level frame
const find = async (query, opts) => {
  const o = opts || {}, limit = o.limit || 30, re = _pattern(query);
  const types = o.type ? String(o.type).toUpperCase().split(/[^A-Z_]+/).filter(Boolean) : null;
  let pages = figma.root.children;
  if (o.page != null) {
    const exact = pages.filter(p => p.name === String(o.page)), like = _pattern(o.page);
    pages = exact.length ? exact : pages.filter(p => like.test(p.name));
    if (!pages.length) throw new Error('find: no page ' + JSON.stringify(o.page) + ' (pages: ' + figma.root.children.map(p => p.name).join(', ') + ')');
    for (const p of pages) await p.loadAsync();
  } else await figma.loadAllPagesAsync();
  const lines = [];
  let total = 0, scanned = 0;
  // Hidden layers inside instances are most of a big file and never what a search is after. The flag is global
  // to the plugin, so it is on only while the search itself runs, never across a pause: a job running beside
  // this one would search with it too.
  const search = page => {
    const skip = figma.skipInvisibleInstanceChildren;
    figma.skipInvisibleInstanceChildren = true;
    try { return types ? page.findAllWithCriteria({ types: types }) : page.findAll(); }
    finally { figma.skipInvisibleInstanceChildren = !!skip; }
  };
  for (const page of pages) {
    await _breathe();
    for (const n of search(page)) {
      if (!(++scanned & 511)) await _breathe();
      const inName = re.test(n.name), byText = !inName && n.type === 'TEXT' && re.test(n.characters);
      if (!inName && !byText || ++total > limit) continue;
      let top = n;
      while (top.parent && top.parent.type !== 'PAGE') top = top.parent;
      lines.push(n.id + ' ' + n.type + ' ' + _str(n.name) + (byText ? ' text=' + _str(n.characters) : '') + ' · ' + page.name + (top !== n ? ' › ' + _clip(top.name, 40) : ''));
    }
  }
  if (!total) return 'no match for ' + JSON.stringify(String(query));
  return lines.join('\n') + (total > limit ? '\n… ' + (total - limit) + ' more (limit ' + limit + ')' : '');
};

const _value = async (v, alias) => {
  if (v && typeof v === 'object' && v.type === 'VARIABLE_ALIAS') return '→' + (await alias(v.id));
  if (v && typeof v === 'object' && 'r' in v) return _hex(v);
  if (typeof v === 'string') return _str(v, 40);
  if (typeof v === 'number') return String(Math.round(v * 1000) / 1000);
  return v == null ? '—' : String(v);
};
// The file's local design tokens. kind 'variables': per collection [modes], one value per mode (one value when
// all modes agree), aliases as →name. 'styles': text, paint, effect and grid styles with their values.
// 'components': sets and components per page with variant axes and properties (defaults after '=').
// opts.filter: name substring or '/regex/'.
const library = async (kind, opts) => {
  const o = opts || {}, limit = o.limit || 300, re = o.filter ? _pattern(o.filter) : null, k = kind || 'variables', L = _lookups(), lines = [];
  let more = 0;
  const add = s => { if (lines.length < limit) lines.push(s); else more++; };
  if (k === 'variables') {
    const lists = await Promise.all([figma.variables.getLocalVariablesAsync(), figma.variables.getLocalVariableCollectionsAsync()]);
    const names = new Map(lists[0].map(v => [v.id, v.name]));
    const alias = async id => names.get(id) || ((await L.variable(id)) || { name: id }).name;
    for (const c of lists[1]) {
      const vars = lists[0].filter(v => v.variableCollectionId === c.id && (!re || re.test(v.name) || re.test(c.name)));
      if (!vars.length) continue;
      const modes = c.modes;
      add(c.name + ' [' + modes.map(m => m.name).join('|') + '] ' + vars.length);
      for (const v of vars) {
        await _breathe();
        const values = [], byMode = v.valuesByMode;
        for (const m of modes) values.push(await _value(byMode[m.modeId], alias));
        add('  ' + v.name + ' ' + (values.every(x => x === values[0]) ? values[0] : values.join(' | ')));
      }
    }
  } else if (k === 'styles') {
    const kinds = [['TEXT', 'getLocalTextStylesAsync'], ['PAINT', 'getLocalPaintStylesAsync'], ['EFFECT', 'getLocalEffectStylesAsync'], ['GRID', 'getLocalGridStylesAsync']];
    for (const pair of kinds) {
      if (typeof figma[pair[1]] !== 'function') continue;
      const list = (await figma[pair[1]]()).filter(s => !re || re.test(s.name));
      if (!list.length) continue;
      add(pair[0] + ' ' + list.length);
      for (const s of list) {
        const value = pair[0] === 'TEXT' ? _type(s) : pair[0] === 'PAINT' ? await _paints(s.paints, L) : pair[0] === 'EFFECT' ? _effects(s.effects) : _grids(s.layoutGrids);
        add('  ' + s.name + (value ? ' ' + value : ''));
      }
    }
  } else if (k === 'components') {
    await figma.loadAllPagesAsync();
    for (const page of figma.root.children) {
      await _breathe();
      const comps = page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })
        .filter(c => !(c.parent && c.parent.type === 'COMPONENT_SET') && (!re || re.test(c.name)));
      if (!comps.length) continue;
      add(page.name + ' ' + comps.length);
      for (const c of comps) {
        const defs = await L.defs(c), about = _get(c, 'description');
        add('  ' + c.id + ' ' + (c.type === 'COMPONENT_SET' ? 'SET ' : '') + _str(c.name) + (defs && Object.keys(defs).length ? ' {' + _defs(defs, true) + '}' : '')
          + (about ? ' — ' + _clip(about.replace(/\s+/g, ' '), 60) : ''));
      }
    }
  } else throw new Error('library: kind is variables, styles or components, not ' + kind);
  return (lines.join('\n') || 'no local ' + k + (re ? ' matching ' + o.filter : '')) + (more ? '\n… ' + more + ' more (use filter)' : '');
};
