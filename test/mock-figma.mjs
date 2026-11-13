// In-memory stand-in for the Figma Plugin API, strict where the real host is strict:
// - every method and accessor throws unless `this` is an object the mock made, and node/variable arguments
//   must be real ones (the host rejects proxies and look-alikes);
// - postMessage structured-clones, so a proxy or a node in a reply fails like it does in Figma;
// - documentAccess "dynamic-page": figma.currentPage cannot be assigned, other pages must be loaded before
//   their children are read, and a document-wide search needs loadAllPagesAsync;
// - text needs its fonts loaded, FILL sizing needs an auto-layout parent;
// - clone() of a component drops componentPropertyReferences (the bug cloneVariant exists for).

const fontKey = f => f.family + ' / ' + f.style;
const deepFreeze = v => { if (v && typeof v === 'object') { Object.values(v).forEach(deepFreeze); Object.freeze(v); } return v; };
const copy = v => (v && typeof v === 'object' ? deepFreeze(structuredClone(v)) : v);

export function createFigma({ fileKey = 'TESTFILE', fileName = 'Test file' } = {}) {
  const S = new WeakMap(); // host object → internal state; being in here is what makes an object "real"
  const byId = new Map(), loadedFonts = new Set(), calls = {}, messages = [];
  const variables = [], collections = [], styles = [];
  const state = { closed: false, allPagesLoaded: false, notified: [], listener: null };
  let seq = 0, propSeq = 0, current = null;
  const count = name => { calls[name] = (calls[name] || 0) + 1; };
  const describe = o => (o === null ? 'null' : typeof o === 'object' ? (S.has(o) ? S.get(o).type : 'a foreign object') : typeof o);
  const st = (o, what) => {
    const s = o && (typeof o === 'object' || typeof o === 'function') ? S.get(o) : undefined;
    if (!s) throw new Error('in ' + what + ': Expected a Figma object, got ' + describe(o));
    return s;
  };
  const live = (o, what) => { const s = st(o, what); if (s.removed) throw new Error('in ' + what + ': The node (instance sublayer or table cell) with id "' + s.id + '" does not exist'); return s; };
  const ancestors = n => { const out = []; for (let p = S.get(n).parent; p; p = S.get(p).parent) out.push(p); return out; };
  const insideInstance = n => ancestors(n).some(a => S.get(a).type === 'INSTANCE');
  const pageOf = n => [n, ...ancestors(n)].find(a => S.get(a).type === 'PAGE') || null;

  // ---- nodes
  class BaseNode {
    get id() { return st(this, 'id').id; }
    get type() { return st(this, 'type').type; }
    get name() { return st(this, 'name').name; }
    set name(v) { live(this, 'set_name').name = String(v); }
    get parent() { return st(this, 'parent').parent; }
    get removed() { return st(this, 'removed').removed; }
    remove() {
      const s = live(this, 'remove');
      if (s.type === 'DOCUMENT') throw new Error('in remove: Cannot remove the document');
      if (s.type === 'PAGE' && this === current) throw new Error('in remove: Cannot remove the current page');
      if (insideInstance(this)) throw new Error('in remove: Cannot remove a node inside an instance');
      // As Figma desktop does it (probed 2026-11): a removed component or component set is not destroyed. It
      // leaves the document (parent null) and stays alive with its layers: `removed` is false and
      // getNodeByIdAsync still finds it. A layer bound to a component property inside such a component
      // refuses remove().
      if (s.refs && Object.keys(s.refs).length && !inDocument(this)) throw new Error('in remove: Removing this node is not allowed');
      detach(this);
      if (s.type !== 'COMPONENT' && s.type !== 'COMPONENT_SET') markRemoved(this);
    }
    toString() { const s = st(this, 'toString'); return '[Node ' + s.id + ']'; }
    setPluginData(key, value) { const s = live(this, 'setPluginData'); if (value === '') delete s.plugin[key]; else s.plugin[key] = String(value); }
    getPluginData(key) { return st(this, 'getPluginData').plugin[key] || ''; }
  }
  const container = {
    children: { get() { const s = st(this, 'children'); readable(this, 'children'); return Object.freeze(s.children.slice()); } },
    appendChild: { value(child) { insert(this, child, Infinity, 'appendChild'); } },
    insertChild: { value(index, child) { insert(this, child, index, 'insertChild'); } },
    findAll: { value(cb) { count('findAll'); readable(this, 'findAll'); return descendants(this).filter(n => !cb || cb(n)); } },
    findOne: { value(cb) { count('findOne'); readable(this, 'findOne'); for (const n of descendants(this)) if (cb(n)) return n; return null; } },
    findChildren: { value(cb) { readable(this, 'findChildren'); return st(this).children.filter(n => !cb || cb(n)); } },
    findAllWithCriteria: { value(c) { count('findAllWithCriteria'); readable(this, 'findAllWithCriteria'); return descendants(this).filter(n => !c.types || c.types.includes(S.get(n).type)); } },
  };
  // Pages other than the current one, and the document as a whole, are not readable until loaded.
  const readable = (node, what) => {
    const s = st(node, what);
    if (s.type === 'DOCUMENT' && what !== 'children' && !state.allPagesLoaded) throw new Error('in ' + what + ': Cannot search the document before "await figma.loadAllPagesAsync()"');
    const page = s.type === 'DOCUMENT' ? null : pageOf(node);
    if (page && !S.get(page).loaded) throw new Error('in ' + what + ': The page "' + S.get(page).name + '" is not loaded. Call "await page.loadAsync()" first');
  };
  const descendants = node => { const out = []; const walk = n => { for (const c of S.get(n).children) { out.push(c); if (S.get(c).children) walk(c); } }; walk(node); return out; };
  const inDocument = node => { for (let n = node; n; n = S.get(n).parent) if (S.get(n).type === 'DOCUMENT') return true; return false; };
  const detach = child => { const p = S.get(child).parent; if (p) { const list = S.get(p).children; list.splice(list.indexOf(child), 1); S.get(child).parent = null; } };
  const markRemoved = n => { const s = S.get(n); s.removed = true; byId.delete(s.id); (s.children || []).forEach(markRemoved); };
  const insert = (parent, child, index, what) => {
    const ps = live(parent, what), cs = live(child, what);
    if (!ps.children) throw new Error('in ' + what + ': ' + ps.type + ' cannot have children');
    if ((cs.type === 'PAGE') !== (ps.type === 'DOCUMENT')) throw new Error('in ' + what + ': Cannot put a ' + cs.type + ' into a ' + ps.type);
    if (ps.type === 'INSTANCE' || insideInstance(parent)) throw new Error('in ' + what + ': Cannot move node. New parent is an instance or is inside of an instance');
    if (ps.type === 'COMPONENT_SET' && cs.type !== 'COMPONENT') throw new Error('in ' + what + ': Component sets can only contain components');
    if (parent === child || ancestors(parent).includes(child)) throw new Error('in ' + what + ': Cannot move a node into itself');
    detach(child);
    ps.children.splice(Math.max(0, Math.min(index, ps.children.length)), 0, child);
    cs.parent = parent;
  };

  // Stored properties: frozen copies in, frozen copies out, like the host.
  const define = (cls, name, def, check) => Object.defineProperty(cls.prototype, name, {
    get() { const s = st(this, name); return name in s.p ? s.p[name] : copy(def); },
    set(v) { const s = live(this, 'set_' + name); if (check) check(this, v, s); s.p[name] = copy(v); },
    configurable: true,
  });
  class SceneNode extends BaseNode {
    get width() { return st(this, 'width').p.width || 100; }
    get height() { return st(this, 'height').p.height || 100; }
    resize(w, h) { const s = live(this, 'resize'); s.p.width = w; s.p.height = h; }
    resizeWithoutConstraints(w, h) { const s = live(this, 'resizeWithoutConstraints'); s.p.width = w; s.p.height = h; }
    get componentPropertyReferences() { const s = st(this, 'componentPropertyReferences'); return s.refs ? copy(s.refs) : null; }
    set componentPropertyReferences(refs) {
      const s = live(this, 'set_componentPropertyReferences');
      if (insideInstance(this)) throw new Error('in set_componentPropertyReferences: Cannot set on a node inside an instance');
      const owner = ancestors(this).find(a => S.get(a).type === 'COMPONENT');
      if (!owner) throw new Error('in set_componentPropertyReferences: Node is not inside a component');
      const defs = definitionsOf(owner);
      for (const key of Object.values(refs || {})) if (!defs[key]) throw new Error("in set_componentPropertyReferences: Could not find a component property with name: '" + key + "'");
      s.refs = refs && Object.keys(refs).length ? copy(refs) : null;
    }
    get boundVariables() { return copy(st(this, 'boundVariables').bound); }
    setBoundVariable(field, variable) {
      const s = live(this, 'setBoundVariable');
      if (variable === null) { delete s.bound[field]; return; }
      if (st(variable, 'setBoundVariable').kind !== 'variable') throw new Error('in setBoundVariable: Expected a Variable');
      s.bound[field] = { type: 'VARIABLE_ALIAS', id: variable.id };
    }
    clone() {
      live(this, 'clone'); count('clone');
      const dup = deepCopy(this, S.get(this).type === 'COMPONENT' ? 'drop-refs' : 'keep-refs');
      insert(current, dup, Infinity, 'clone');
      return dup;
    }
    async setReactionsAsync(reactions) { live(this, 'setReactionsAsync').p.reactions = copy(reactions); }
    exportAsync(opts) { live(this, 'exportAsync'); return Promise.resolve(Uint8Array.from([137, 80, 78, 71, ...Buffer.from(this.id + ':' + JSON.stringify(opts || {}))])); }
  }
  for (const [name, def] of [['visible', true], ['locked', false], ['x', 0], ['y', 0], ['opacity', 1], ['fills', []], ['strokes', []],
    ['layoutAlign', 'INHERIT'], ['layoutGrow', 0], ['description', ''], ['fillStyleId', ''], ['strokeStyleId', ''], ['strokeWeight', 1],
    ['effects', []], ['effectStyleId', ''], ['rotation', 0]]) define(SceneNode, name, def);
  SceneNode.prototype.setFillStyleIdAsync = async function (id) { live(this, 'setFillStyleIdAsync').p.fillStyleId = String(id); };
  for (const axis of ['Horizontal', 'Vertical']) define(SceneNode, 'layoutSizing' + axis, 'FIXED', (node, v, s) => {
    const p = s.parent && S.get(s.parent);
    if (v === 'FILL' && !(p && p.p.layoutMode && p.p.layoutMode !== 'NONE')) throw new Error('in set_layoutSizing' + axis + ': FILL can only be set on children of auto-layout frames');
    if (v === 'HUG' && s.type !== 'TEXT' && !(s.p.layoutMode && s.p.layoutMode !== 'NONE')) throw new Error('in set_layoutSizing' + axis + ': HUG can only be set on auto-layout frames and text');
  });
  define(SceneNode, 'layoutPositioning', 'AUTO', (node, v, s) => {
    const p = s.parent && S.get(s.parent);
    if (v === 'ABSOLUTE' && !(p && p.p.layoutMode && p.p.layoutMode !== 'NONE')) throw new Error('in set_layoutPositioning: ABSOLUTE needs an auto-layout parent');
  });

  class FrameNode extends SceneNode {}
  Object.defineProperties(FrameNode.prototype, container);
  for (const [name, def] of [['layoutMode', 'NONE'], ['primaryAxisSizingMode', 'FIXED'], ['counterAxisSizingMode', 'FIXED'], ['itemSpacing', 0],
    ['paddingTop', 0], ['paddingRight', 0], ['paddingBottom', 0], ['paddingLeft', 0], ['cornerRadius', 0], ['layoutWrap', 'NO_WRAP'],
    ['primaryAxisAlignItems', 'MIN'], ['counterAxisAlignItems', 'MIN'], ['clipsContent', true]]) define(FrameNode, name, def);
  class GroupNode extends SceneNode {}
  Object.defineProperties(GroupNode.prototype, container);
  class SectionNode extends SceneNode {}
  Object.defineProperties(SectionNode.prototype, container);
  class RectangleNode extends SceneNode {}
  define(RectangleNode, 'cornerRadius', 0);

  class TextNode extends SceneNode {
    get characters() { return st(this, 'characters').chars; }
    set characters(v) {
      const s = live(this, 'set_characters');
      for (const r of s.runs) if (!loadedFonts.has(fontKey(r.font))) throw new Error('in set_characters: Cannot write to node with unloaded font "' + fontKey(r.font) + '". Please call figma.loadFontAsync({ family: "' + r.font.family + '", style: "' + r.font.style + '" }) and await the returned promise first.');
      s.chars = String(v); s.runs = [{ font: s.runs[0].font, length: s.chars.length }];
    }
    get fontName() { const s = st(this, 'fontName'); const keys = new Set(s.runs.map(r => fontKey(r.font))); return keys.size > 1 ? mixed : copy(s.runs[0].font); }
    set fontName(f) {
      const s = live(this, 'set_fontName');
      if (!f || typeof f.family !== 'string' || !loadedFonts.has(fontKey(f))) throw new Error('in set_fontName: Cannot use unloaded font "' + (f && fontKey(f)) + '"');
      s.runs = [{ font: copy(f), length: s.chars.length }];
    }
    getRangeAllFontNames(start, end) {
      const s = st(this, 'getRangeAllFontNames'); const out = new Map(); let at = 0;
      for (const r of s.runs) { if (at < end && at + r.length > start || (r.length === 0 && at === start)) out.set(fontKey(r.font), copy(r.font)); at += r.length; }
      return [...out.values()];
    }
  }
  for (const [name, def] of [['fontSize', 12], ['textAutoResize', 'WIDTH_AND_HEIGHT'], ['lineHeight', { unit: 'AUTO' }],
    ['letterSpacing', { unit: 'PERCENT', value: 0 }], ['textStyleId', '']]) define(TextNode, name, def);

  const variantProps = name => { const out = {}; for (const part of String(name).split(',')) { const [k, v] = part.split('=').map(x => x.trim()); if (k && v !== undefined) out[k] = v; } return out; };
  const definitionsOf = comp => {
    const s = S.get(comp), set = s.type === 'COMPONENT' && s.parent && S.get(s.parent).type === 'COMPONENT_SET' ? s.parent : null;
    if (!set) return s.defs;
    const out = {}, variants = S.get(set).children;
    for (const v of variants) for (const [k, val] of Object.entries(variantProps(S.get(v).name))) {
      out[k] = out[k] || { type: 'VARIANT', defaultValue: variantProps(S.get(variants[0]).name)[k], variantOptions: [] };
      if (!out[k].variantOptions.includes(val)) out[k].variantOptions.push(val);
    }
    return Object.assign(out, S.get(set).defs);
  };
  const addProperty = (node, what, name, type, defaultValue) => {
    const s = live(node, what);
    if (s.type === 'COMPONENT' && s.parent && S.get(s.parent).type === 'COMPONENT_SET') throw new Error('in ' + what + ': Can only add component properties to a component set or a non-variant component');
    if (type === 'VARIANT') throw new Error('in ' + what + ': Use variant names to add VARIANT properties');
    const key = name + '#' + (++propSeq) + ':0';
    s.defs[key] = { type, defaultValue };
    return key;
  };
  class ComponentNode extends FrameNode {
    createInstance() {
      live(this, 'createInstance'); count('createInstance');
      const inst = make('INSTANCE', null, 'Instance');
      const s = S.get(inst); s.name = S.get(this).name.includes('=') ? S.get(pageOwner(this)).name : S.get(this).name; s.main = this;
      buildInstance(inst);
      insert(current, inst, Infinity, 'createInstance');
      return inst;
    }
    addComponentProperty(name, type, defaultValue) { return addProperty(this, 'addComponentProperty', name, type, defaultValue); }
    get componentPropertyDefinitions() {
      const s = st(this, 'componentPropertyDefinitions');
      if (s.parent && S.get(s.parent).type === 'COMPONENT_SET') throw new Error('in componentPropertyDefinitions: Can only get definitions of a component set or non-variant component');
      return copy(s.defs);
    }
    get variantProperties() { const s = st(this, 'variantProperties'); return s.parent && S.get(s.parent).type === 'COMPONENT_SET' ? copy(variantProps(s.name)) : null; }
  }
  const pageOwner = comp => { const s = S.get(comp); return s.parent && S.get(s.parent).type === 'COMPONENT_SET' ? s.parent : comp; };
  class ComponentSetNode extends FrameNode {
    get defaultVariant() { return st(this, 'defaultVariant').children[0] || null; }
    addComponentProperty(name, type, defaultValue) { return addProperty(this, 'addComponentProperty', name, type, defaultValue); }
    get componentPropertyDefinitions() { st(this, 'componentPropertyDefinitions'); return copy(definitionsOf(this.defaultVariant)); }
  }
  class InstanceNode extends FrameNode {
    get mainComponent() { return st(this, 'mainComponent').main; }
    async getMainComponentAsync() { return st(this, 'getMainComponentAsync').main; }
    set mainComponent(c) { this.swapComponent(c); }
    swapComponent(c) {
      const s = live(this, 'swapComponent');
      if (st(c, 'swapComponent').type !== 'COMPONENT') throw new Error('in swapComponent: Expected a component');
      s.main = c; buildInstance(this);
    }
    get componentProperties() {
      const s = st(this, 'componentProperties'), defs = definitionsOf(s.main), out = {};
      for (const [k, d] of Object.entries(defs)) out[k] = { type: d.type, value: d.type === 'VARIANT' ? variantProps(S.get(s.main).name)[k] : k in s.overrides ? s.overrides[k] : d.defaultValue };
      return copy(out);
    }
    setProperties(values) {
      const s = live(this, 'setProperties'), defs = definitionsOf(s.main);
      for (const [k, v] of Object.entries(values)) {
        const d = defs[k];
        if (!d) throw new Error("in setProperties: Could not find a component property with name: '" + k + "'");
        if (d.type === 'VARIANT') {
          const want = Object.assign(variantProps(S.get(s.main).name), { [k]: v });
          const next = S.get(S.get(s.main).parent).children.find(c => Object.entries(want).every(([a, b]) => variantProps(S.get(c).name)[a] === b));
          if (!next) throw new Error('in setProperties: No variant with ' + JSON.stringify(want));
          s.main = next; buildInstance(this);
        } else {
          // A TEXT property writes into the bound text layers, so their fonts have to be loaded like for characters.
          if (d.type === 'TEXT') for (const t of descendants(this)) {
            const ts = S.get(t);
            if (ts.type === 'TEXT' && ts.refs && ts.refs.characters === k) for (const r of ts.runs) if (!loadedFonts.has(fontKey(r.font))) throw new Error('in setProperties: Cannot write to node with unloaded font "' + fontKey(r.font) + '"');
          }
          s.overrides[k] = v;
        }
      }
      applyOverrides(this);
    }
    detachInstance() {
      const s = live(this, 'detachInstance');
      const frame = make('FRAME', null, s.name); const fs = S.get(frame);
      fs.p = Object.assign({}, s.p);
      for (const c of s.children.slice()) { detach(c); fs.children.push(c); S.get(c).parent = frame; }
      const parent = s.parent, list = S.get(parent).children;
      list.splice(list.indexOf(this), 1, frame); fs.parent = parent; s.parent = null; markRemoved(this);
      return frame;
    }
  }
  // Instance sublayers mirror the main component, references included; overrides then drive them.
  const buildInstance = inst => {
    const s = S.get(inst);
    for (const c of s.children.slice()) { detach(c); markRemoved(c); }
    for (const c of S.get(s.main).children) { const dup = deepCopy(c, 'keep-refs'); s.children.push(dup); S.get(dup).parent = inst; }
    s.p = Object.assign({}, S.get(s.main).p);
    applyOverrides(inst);
  };
  const applyOverrides = inst => {
    const s = S.get(inst), props = inst.componentProperties;
    const walk = n => { for (const c of S.get(n).children) {
      const cs = S.get(c);
      if (cs.refs) for (const [field, key] of Object.entries(cs.refs)) {
        if (!props[key]) continue;
        if (field === 'characters') { cs.chars = String(props[key].value); cs.runs = [{ font: cs.runs[0].font, length: cs.chars.length }]; }
        if (field === 'visible') cs.p.visible = !!props[key].value;
      }
      if (cs.children && cs.type !== 'INSTANCE') walk(c);
    } };
    walk(inst);
  };
  const deepCopy = (node, refs) => {
    const s = S.get(node), dup = make(s.type, null, s.name), ds = S.get(dup);
    ds.p = structuredClone(s.p); ds.bound = structuredClone(s.bound); ds.plugin = Object.assign({}, s.plugin);
    ds.refs = refs === 'keep-refs' && s.refs ? copy(s.refs) : null;
    if (s.type === 'TEXT') { ds.chars = s.chars; ds.runs = structuredClone(s.runs); }
    if (s.type === 'COMPONENT' || s.type === 'COMPONENT_SET') ds.defs = structuredClone(s.defs);
    if (s.type === 'INSTANCE') { ds.main = s.main; ds.overrides = Object.assign({}, s.overrides); }
    for (const c of s.children || []) { const cc = deepCopy(c, refs); ds.children.push(cc); S.get(cc).parent = dup; }
    return dup;
  };

  class PageNode extends BaseNode {
    get selection() { return Object.freeze(st(this, 'selection').selection.slice()); }
    set selection(nodes) { const s = live(this, 'set_selection'); nodes.forEach(n => st(n, 'set_selection')); s.selection = nodes.slice(); }
    loadAsync() { st(this, 'loadAsync').loaded = true; return Promise.resolve(); }
  }
  // Figma's PageNode has the export mixin too, but no width or height.
  PageNode.prototype.exportAsync = SceneNode.prototype.exportAsync;
  Object.defineProperties(PageNode.prototype, container);
  class DocumentNode extends BaseNode {}
  Object.defineProperties(DocumentNode.prototype, container);

  const CLASSES = { DOCUMENT: DocumentNode, PAGE: PageNode, FRAME: FrameNode, GROUP: GroupNode, SECTION: SectionNode, RECTANGLE: RectangleNode,
    TEXT: TextNode, COMPONENT: ComponentNode, COMPONENT_SET: ComponentSetNode, INSTANCE: InstanceNode };
  const CONTAINERS = new Set(['DOCUMENT', 'PAGE', 'FRAME', 'GROUP', 'SECTION', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE']);
  function make(type, parent, name) {
    const node = new CLASSES[type]();
    const s = { kind: 'node', id: (type === 'DOCUMENT' ? '0:' : '1:') + (++seq), type, name: name || type.charAt(0) + type.slice(1).toLowerCase(),
      parent: null, removed: false, p: {}, bound: {}, plugin: {}, refs: null, children: CONTAINERS.has(type) ? [] : null };
    if (type === 'FRAME' || type === 'COMPONENT') s.p.fills = copy([{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]);
    if (type === 'TEXT') { s.chars = ''; s.runs = [{ font: { family: 'Inter', style: 'Regular' }, length: 0 }]; }
    if (type === 'COMPONENT' || type === 'COMPONENT_SET') s.defs = {};
    if (type === 'INSTANCE') s.overrides = {};
    if (type === 'PAGE') { s.loaded = true; s.selection = []; }
    S.set(node, s); byId.set(s.id, node);
    if (parent) insert(parent, node, Infinity, 'create');
    return node;
  }
  const mixed = Symbol('figma.mixed');
  const root = make('DOCUMENT', null, fileName);
  current = make('PAGE', root, 'Page 1');

  // ---- variables and styles
  class Variable {
    get id() { return st(this, 'id').id; }
    get name() { return st(this, 'name').name; }
    set name(v) { live(this, 'set_name').name = String(v); }
    get resolvedType() { return st(this, 'resolvedType').resolvedType; }
    get variableCollectionId() { return st(this, 'variableCollectionId').collectionId; }
    get valuesByMode() { return copy(st(this, 'valuesByMode').values); }
    get remote() { st(this, 'remote'); return false; }
    get key() { return st(this, 'key').id.replace(/\W/g, ''); }
    setValueForMode(modeId, value) { live(this, 'setValueForMode').values[modeId] = copy(value); }
    remove() { const s = live(this, 'remove'); s.removed = true; const c = collections.find(x => S.get(x).id === s.collectionId); if (c) S.get(c).variableIds = S.get(c).variableIds.filter(id => id !== s.id); }
  }
  define(Variable, 'description', '');
  define(Variable, 'scopes', ['ALL_SCOPES']);
  class VariableCollection {
    get id() { return st(this, 'id').id; }
    get name() { return st(this, 'name').name; }
    set name(v) { live(this, 'set_name').name = String(v); }
    get modes() { return copy(st(this, 'modes').modes); }
    get defaultModeId() { return st(this, 'defaultModeId').modes[0].modeId; }
    get variableIds() { return copy(st(this, 'variableIds').variableIds); }
    get remote() { st(this, 'remote'); return false; }
    addMode(name) { const s = live(this, 'addMode'); const modeId = s.id + ':m' + (s.modes.length + 1); s.modes.push({ modeId, name }); return modeId; }
    renameMode(modeId, name) { const m = live(this, 'renameMode').modes.find(x => x.modeId === modeId); if (!m) throw new Error('in renameMode: no mode ' + modeId); m.name = name; }
    remove() { const s = live(this, 'remove'); s.removed = true; for (const v of variables) if (S.get(v).collectionId === s.id) S.get(v).removed = true; }
  }
  class PaintStyle {
    get id() { return st(this, 'id').id; }
    get type() { return st(this, 'type').styleType; }
    get name() { return st(this, 'name').name; }
    set name(v) { live(this, 'set_name').name = String(v); }
    get remote() { st(this, 'remote'); return false; }
    get key() { return st(this, 'key').id.replace(/\W/g, ''); }
    remove() { live(this, 'remove').removed = true; }
    // Plain records that carry nodes: the shape a recorder has to look inside.
    async getStyleConsumersAsync() {
      const id = st(this, 'getStyleConsumersAsync').id;
      return [...byId.values()].filter(n => S.get(n).p.fillStyleId === id).map(node => ({ node, fields: ['fills'] }));
    }
  }
  define(PaintStyle, 'paints', []);
  define(PaintStyle, 'description', '');
  // Text and effect styles share the base; only their values differ.
  class TextStyle extends PaintStyle {}
  for (const [name, def] of [['fontName', { family: 'Inter', style: 'Regular' }], ['fontSize', 12], ['lineHeight', { unit: 'AUTO' }], ['letterSpacing', { unit: 'PERCENT', value: 0 }]]) define(TextStyle, name, def);
  class EffectStyle extends PaintStyle {}
  define(EffectStyle, 'effects', []);
  const makeStyle = (Cls, styleType) => { const s = new Cls(); S.set(s, { kind: 'style', styleType, id: 'S:' + (++seq).toString(16) + ',', name: 'Style', removed: false, p: {} }); styles.push(s); return s; };
  const stylesOf = type => alive(styles).filter(s => S.get(s).styleType === type);
  const alive = list => list.filter(x => !S.get(x).removed);
  // Host objects cannot cross postMessage (a proxy fails in structuredClone by itself).
  const hostObjectsIn = v => {
    if (!v || typeof v !== 'object' || ArrayBuffer.isView(v)) return;
    if (S.has(v)) throw new Error('in postMessage: Cannot send a Figma object (' + S.get(v).type + ')');
    Object.values(v).forEach(hostObjectsIn);
  };

  const figma = {
    mixed, fileKey,
    get root() { return root; },
    get currentPage() { return current; },
    set currentPage(page) { throw new Error('Setting "figma.currentPage" is not supported with "documentAccess": "dynamic-page". Use "await figma.setCurrentPageAsync(page)"'); },
    async setCurrentPageAsync(page) { const s = live(page, 'setCurrentPageAsync'); if (s.type !== 'PAGE') throw new Error('in setCurrentPageAsync: Expected a page'); s.loaded = true; current = page; },
    async loadAllPagesAsync() { count('loadAllPagesAsync'); state.allPagesLoaded = true; for (const p of S.get(root).children) S.get(p).loaded = true; },
    async getNodeByIdAsync(id) { return byId.get(id) || null; },
    getNodeById() { throw new Error('Cannot call figma.getNodeById with "documentAccess": "dynamic-page". Use figma.getNodeByIdAsync'); },
    async loadFontAsync(font) { if (!font || typeof font.family !== 'string' || typeof font.style !== 'string') throw new Error('in loadFontAsync: Expected a FontName'); count('loadFontAsync'); loadedFonts.add(fontKey(font)); },
    createFrame() { return make('FRAME', current, 'Frame'); },
    createText() { return make('TEXT', current, 'Text'); },
    createRectangle() { return make('RECTANGLE', current, 'Rectangle'); },
    createComponent() { return make('COMPONENT', current, 'Component'); },
    createSection() { return make('SECTION', current, 'Section'); },
    createPage() { const p = make('PAGE', root, 'Page ' + (S.get(root).children.length + 1)); return p; },
    combineAsVariants(nodes, parent, index) {
      if (!nodes.length) throw new Error('in combineAsVariants: Needs at least one component');
      for (const n of nodes) if (live(n, 'combineAsVariants').type !== 'COMPONENT') throw new Error('in combineAsVariants: Expected components');
      live(parent, 'combineAsVariants');
      const set = make('COMPONENT_SET', null, 'Component Set');
      insert(parent, set, index === undefined ? Infinity : index, 'combineAsVariants');
      for (const n of nodes) insert(set, n, Infinity, 'combineAsVariants');
      return set;
    },
    group(nodes, parent, index) {
      if (!nodes.length) throw new Error('in group: First argument must be an array of at least one node');
      nodes.forEach(n => live(n, 'group')); live(parent, 'group');
      const g = make('GROUP', null, 'Group');
      insert(parent, g, index === undefined ? Infinity : index, 'group');
      for (const n of nodes) insert(g, n, Infinity, 'group');
      return g;
    },
    ungroup(group) {
      const s = live(group, 'ungroup'), kids = s.children.slice(), parent = s.parent;
      let at = S.get(parent).children.indexOf(group);
      for (const k of kids) insert(parent, k, at++, 'ungroup');
      group.remove();
      return kids;
    },
    showUI() {},
    ui: {
      onmessage: undefined,
      postMessage(msg) { hostObjectsIn(msg); const m = structuredClone(msg); messages.push(m); if (state.listener) state.listener(m); },
      resize() {},
      on() {},
    },
    notify(message) { state.notified.push(message); return { cancel() {} }; },
    on(type, handler) { (state.handlers = state.handlers || []).push(handler); },
    off(type, handler) { state.handlers = (state.handlers || []).filter(h => h !== handler); },
    closePlugin() { state.closed = true; },
    commitUndo() {},
    triggerUndo() { state.undone = true; },
    async saveVersionHistoryAsync(title) { state.savedVersion = title; return { id: 'v1' }; },
    viewport: {
      center: { x: 0, y: 0 }, zoom: 1,
      scrollAndZoomIntoView(nodes) { nodes.forEach(n => live(n, 'scrollAndZoomIntoView')); state.scrolledTo = nodes.map(n => n.id); },
    },
    variables: {
      async getLocalVariablesAsync(type) { count('getLocalVariablesAsync'); return alive(variables).filter(v => !type || S.get(v).resolvedType === type); },
      async getLocalVariableCollectionsAsync() { count('getLocalVariableCollectionsAsync'); return alive(collections); },
      async getVariableByIdAsync(id) { return alive(variables).find(v => S.get(v).id === id) || null; },
      async getVariableCollectionByIdAsync(id) { return alive(collections).find(c => S.get(c).id === id) || null; },
      createVariableCollection(name) {
        const c = new VariableCollection(), id = 'VariableCollectionId:1:' + (++seq);
        S.set(c, { kind: 'collection', id, name, removed: false, modes: [{ modeId: id + ':m1', name: 'Mode 1' }], variableIds: [] });
        collections.push(c); return c;
      },
      createVariable(name, collection, resolvedType) {
        if (typeof collection === 'string') throw new Error('in createVariable: Passing a collection id is no longer supported. Pass the collection node');
        const cs = live(collection, 'createVariable');
        if (cs.kind !== 'collection') throw new Error('in createVariable: Expected a VariableCollection');
        const v = new Variable(), id = 'VariableID:1:' + (++seq);
        S.set(v, { kind: 'variable', id, name, resolvedType, collectionId: cs.id, values: {}, removed: false, p: {} });
        cs.variableIds.push(id); variables.push(v); return v;
      },
      createVariableAlias(v) { return { type: 'VARIABLE_ALIAS', id: live(v, 'createVariableAlias').id }; },
      setBoundVariableForPaint(paint, field, variable) {
        const out = Object.assign({}, paint);
        if (variable === null) delete out.boundVariables;
        else {
          const vs = live(variable, 'setBoundVariableForPaint');
          if (vs.kind !== 'variable') throw new Error('in setBoundVariableForPaint: Expected a Variable');
          out.boundVariables = { [field]: { type: 'VARIABLE_ALIAS', id: vs.id } };
        }
        return copy(out);
      },
    },
    async getLocalPaintStylesAsync() { return stylesOf('PAINT'); },
    async getLocalTextStylesAsync() { return stylesOf('TEXT'); },
    async getLocalEffectStylesAsync() { return stylesOf('EFFECT'); },
    async getStyleByIdAsync(id) { return alive(styles).find(s => S.get(s).id === id) || null; },
    createPaintStyle() { return makeStyle(PaintStyle, 'PAINT'); },
    createTextStyle() { return makeStyle(TextStyle, 'TEXT'); },
    createEffectStyle() { return makeStyle(EffectStyle, 'EFFECT'); },
    // Reorders the local styles: a file write that is a figma-level call, not a style method.
    moveLocalPaintStyleAfter(target, reference) {
      live(target, 'moveLocalPaintStyleAfter'); if (reference !== null) live(reference, 'moveLocalPaintStyleAfter');
      styles.splice(styles.indexOf(target), 1);
      styles.splice(reference === null ? 0 : styles.indexOf(reference) + 1, 0, target);
    },
  };

  // ---- test-only helpers (never reachable from the code under test)
  const setMixedText = (node, parts) => {
    const s = st(node, 'setMixedText');
    s.chars = parts.map(p => p.text).join('');
    s.runs = parts.map(p => ({ font: copy(p.font), length: p.text.length }));
  };
  const setCharacters = (node, chars) => { const s = st(node, 'setCharacters'); s.chars = chars; s.runs = [{ font: s.runs[0].font, length: chars.length }]; };
  // Everything a job could change, as plain data: equal snapshots = untouched file.
  const snapshot = () => {
    const node = n => {
      const s = S.get(n);
      return { id: s.id, type: s.type, name: s.name, p: s.p, bound: s.bound, plugin: s.plugin, refs: s.refs, chars: s.chars, runs: s.runs,
        defs: s.defs, main: s.main ? S.get(s.main).id : undefined, overrides: s.overrides, removed: s.removed,
        children: s.children ? s.children.map(node) : undefined };
    };
    const plain = o => { const s = S.get(o); return { id: s.id, name: s.name, removed: s.removed, values: s.values, modes: s.modes, variableIds: s.variableIds, p: s.p }; };
    return JSON.parse(JSON.stringify({ document: node(root), variables: alive(variables).map(plain), collections: alive(collections).map(plain), styles: alive(styles).map(plain) }));
  };
  // Forget what a plugin session would not know yet: loaded fonts, loaded pages, call counters.
  const resetSession = () => {
    loadedFonts.clear(); state.allPagesLoaded = false; messages.length = 0;
    for (const k of Object.keys(calls)) delete calls[k];
    for (const p of S.get(root).children) S.get(p).loaded = p === current;
  };
  return { figma, messages, state, calls, loadedFonts, snapshot, setMixedText, setCharacters, resetSession, isReal: o => S.has(o) };
}

// A small file with the things jobs usually touch: a screen page with an auto-layout card, a component
// page (not loaded at start) with a variant set whose label is bound to a TEXT property, variables in
// two collections sharing a name, and a paint style.
export async function createFixture() {
  const mock = createFigma();
  const { figma } = mock;
  const INTER = { family: 'Inter', style: 'Regular' }, BOLD = { family: 'Inter', style: 'Bold' };
  await figma.loadFontAsync(INTER); await figma.loadFontAsync(BOLD);
  const screens = figma.currentPage; screens.name = 'Screens';
  const card = figma.createFrame(); card.name = 'Card'; card.layoutMode = 'VERTICAL';
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
  const title = figma.createText(); title.fontName = BOLD; title.characters = 'Hello'; title.name = 'Title';
  card.appendChild(title);
  const badge = figma.createRectangle(); badge.name = 'Badge'; card.appendChild(badge);
  const mixedText = figma.createText(); mixedText.name = 'Mixed'; card.appendChild(mixedText);
  mock.setMixedText(mixedText, [{ text: 'Bold ', font: BOLD }, { text: 'mono', font: { family: 'Roboto Mono', style: 'Regular' } }]);
  const section = figma.createSection(); section.name = 'Keep me';

  const components = figma.createPage(); components.name = 'Components';
  await figma.setCurrentPageAsync(components);
  const variant = (name, label) => { const c = figma.createComponent(); c.name = name; c.layoutMode = 'HORIZONTAL'; const t = figma.createText(); t.name = 'Label'; t.characters = label; c.appendChild(t); return c; };
  const button = figma.combineAsVariants([variant('Size=Large, State=Off', 'Go'), variant('Size=Small, State=On', 'Go'), variant('Size=Small, State=Off', 'Go'), variant('Size=Large, State=On', 'Go')], components);
  button.name = 'Button';
  const labelKey = button.addComponentProperty('Label', 'TEXT', 'Go');
  for (const v of button.children) v.findOne(n => n.name === 'Label').componentPropertyReferences = { characters: labelKey };
  const icon = figma.createComponent(); icon.name = 'Icon';
  await figma.setCurrentPageAsync(screens);

  const colors = figma.variables.createVariableCollection('Colors');
  const primary = figma.variables.createVariable('color/primary', colors, 'COLOR');
  primary.setValueForMode(colors.defaultModeId, { r: 0, g: 0.3, b: 1, a: 1 });
  const spacing = figma.variables.createVariable('space/md', colors, 'FLOAT');
  const brand = figma.variables.createVariableCollection('Brand');
  const brandPrimary = figma.variables.createVariable('color/primary', brand, 'COLOR');
  const red = figma.createPaintStyle(); red.name = 'Brand/Red'; red.paints = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];

  mock.resetSession();
  return { mock, figma, screens, card, title, badge, mixedText, section, components, button, labelKey, icon, colors, primary, spacing, brand, brandPrimary, red };
}
