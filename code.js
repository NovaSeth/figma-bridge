// Claude Bridge: runs Plugin API scripts sent by the local server (localhost only) and posts the result back.
// The plugin window has to stay open; closing it ends the bridge.
// Plain script for the plugin sandbox: no optional chaining, no object spread, one file (manifest "main").
figma.showUI(__html__, { width: 280, height: 112, title: 'Claude Bridge', themeColors: true });

// File identity for the server (it reads comments over REST, the Plugin API cannot see them).
const context = () => ({ type: 'context', fileKey: figma.fileKey || null, fileName: figma.root.name });
figma.ui.postMessage(context());

// The "Claude słucha komentarzy" toggle lives in the server's data/state.json; a per-user copy here brings it
// back when the plugin is reopened (the window sends it on to the server).
const restoreListen = () => {
  if (!figma.clientStorage) return;
  figma.clientStorage.getAsync('listen').then(on => { if (typeof on === 'boolean') figma.ui.postMessage({ type: 'listen', on: on }); }, () => {});
};
const saveListen = on => { if (figma.clientStorage) figma.clientStorage.setAsync('listen', !!on).catch(() => {}); };

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
// project.mjs (buildPrelude) joins prelude files with this marker (keep both copies equal). Every prelude file and the job get
// nested function scopes, outermost first, so a job may declare its own `const hex` and shadow the helper;
// one flat body would stop at a duplicate-declaration SyntaxError.
const PRELUDE_SEPARATOR = '\n/*@bridge:prelude-scope*/\n';
const compile = (prelude, code) => {
  const body = (prelude ? prelude.split(PRELUDE_SEPARATOR) : []).concat(code)
    .reduceRight((inner, outer) => outer + '\n;return (async () => {\n' + inner + '\n})();');
  // Running the sent code is the bridge's job; eval is only the fallback for a sandbox without AsyncFunction.
  try { return new AsyncFunction('figma', 'shot', 'progress', 'breathe', body); }
  catch (e) { return eval('(async function (figma, shot, progress, breathe) {\n' + body + '\n})'); }
};

// A job runs on the thread Figma's editor runs on: a long loop without a pause freezes the whole editor, and the
// progress bar too, because messages reach the window only once the loop ends. `await breathe()` hands control
// back for a moment, at most every 50 ms, so Figma can redraw and take clicks.
let lastBreath = 0, lastProgress = 0;
// Jobs overlap at their awaits: the window hands over the next one while the first still runs. A job counts as
// running until it returns or its time limit is over (the server has given up on it by then, and one that never
// returns must not count for ever).
const running = {}; // job id → when its time is over
let startedJobs = 0;
const runningNow = () => {
  let n = 0;
  for (const id of Object.keys(running)) { if (running[id] < Date.now()) delete running[id]; else n++; }
  return n;
};
const breathe = async () => {
  if (Date.now() - lastBreath < 50) return;
  await new Promise(ok => setTimeout(ok, 0));
  lastBreath = Date.now();
};

// Dry run: the job gets a recording stand-in for `figma`. Writes to objects that existed before the job are
// logged instead of applied. Objects the job creates are real, so its logic keeps working, and are removed
// at the end. Everything the host hands out is wrapped on the way in and unwrapped on the way back, because
// the host rejects anything that is not its own node.
const MUTATORS = /^(set|insert|delete|remove|append|resize|rescale|swap|detach|reset|clear|add|edit|rename)/;
const CREATORS = /^(create|clone$|detachInstance$|outlineStroke$)/;
const COMBINERS = /^(group|ungroup|flatten|union|subtract|intersect|exclude|combineAsVariants|createComponentFromNode)$/;
const BLOCKED = /^(closePlugin|triggerUndo|saveVersionHistoryAsync|setFileThumbnailNodeAsync)$/;
// figma.moveLocalPaintStyleAfter & co.: file writes that are figma-level calls, not methods of the style.
const STYLE_MOVES = /^moveLocal/;
const MAX_ENTRIES = 200;

// Several signals per kind: an object the recorder fails to recognise would be handed to the job raw,
// and its writes would land in the file. A style also needs remove(): plain data such as a JSON_REST_V1
// export has TEXT-typed records with an id too.
const kindOf = o => {
  if (!o || typeof o !== 'object' || typeof o.id !== 'string') return null;
  if ('variableCollectionId' in o || 'resolvedType' in o) return 'variable';
  if ('variableIds' in o || ('modes' in o && 'defaultModeId' in o)) return 'collection';
  if ('parent' in o || 'removed' in o) return 'node';
  return typeof o.type === 'string' && /^(PAINT|TEXT|EFFECT|GRID)$/.test(o.type) && typeof o.remove === 'function' ? 'style' : null;
};

function recorder(real, startPage) {
  if (typeof Proxy !== 'function' || typeof WeakMap !== 'function') throw new Error('dry run unavailable: no Proxy in this sandbox');
  if (kindOf(real.root) !== 'node' || kindOf(startPage) !== 'node') throw new Error('dry run unavailable: nodes not recognised');
  const proxies = new WeakMap(), targets = new WeakMap();
  const created = new Set(), createdList = [], standIns = new Set(), touched = new Set();
  const report = { dryRun: true, counts: { set: 0, call: 0, remove: 0 }, touched: 0, created: {}, entries: [], truncated: false, cleanedUp: 0, error: null };

  const typeOf = o => { const k = kindOf(o); return k === 'variable' ? 'VARIABLE' : k === 'collection' ? 'VARIABLE_COLLECTION' : k === 'style' ? o.type + '_STYLE' : o.type; };
  // Descendants of a created node (clone sublayers, instance children) are just as disposable.
  const isCreated = o => { for (let n = o; n; n = n.parent) if (created.has(n)) return true; return false; };
  const adopt = o => { if (!created.has(o)) { created.add(o); createdList.push(o); } };
  const track = v => {
    if (v && typeof v.then === 'function') return v.then(track);
    if (Array.isArray(v)) v.forEach(track);
    else if (kindOf(v) && !created.has(v)) { adopt(v); const t = typeOf(v); report.created[t] = (report.created[t] || 0) + 1; }
    return v;
  };

  const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
  const summary = v => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'symbol') return v === real.mixed ? 'mixed' : String(v);
    if (typeof v === 'string') return clip(v, 80);
    if (typeof v === 'function') return '[function]';
    if (typeof v !== 'object') return v;
    const o = targets.get(v) || v;
    if (kindOf(o)) return { id: o.id, name: o.name };
    try {
      return clip(JSON.stringify(v, (k, x) => {
        const t = x && typeof x === 'object' ? targets.get(x) || x : x;
        return kindOf(t) ? { id: t.id, name: t.name } : typeof x === 'symbol' ? 'mixed' : x;
      }), 120);
    } catch (e) { return clip(String(v), 120); }
  };
  const record = (op, target, detail) => {
    report.counts[op]++;
    if (target) touched.add(target.id);
    if (report.entries.length >= MAX_ENTRIES) { report.truncated = true; return; }
    report.entries.push({
      op: op, id: target ? target.id : null, name: target ? target.name : null, type: target ? typeOf(target) : null,
      prop: detail.prop ? String(detail.prop) : null, method: detail.method || null,
      from: 'from' in detail ? summary(detail.from) : null, to: 'to' in detail ? summary(detail.to) : null,
    });
  };

  // A plain record from any realm (the host may build its objects outside the plugin's realm): its prototype
  // is the end of the chain. Class instances and typed arrays are left alone.
  const isPlain = v => { const p = Object.getPrototypeOf(v); return p === null || Object.getPrototypeOf(p) === null; };
  // Plain host records carry nodes too (style consumers' { node, fields }, change events), so wrapping goes
  // into arrays and plain objects; untouched data comes back as the same object.
  const wrap = (v, depth) => {
    if (!v || typeof v !== 'object' || targets.has(v)) return v;
    if (typeof v.then === 'function') return v.then(x => wrap(x));
    if (kindOf(v)) return proxyOf(v, 'object');
    const d = (depth || 0) + 1;
    if (d > 5) return v;
    if (Array.isArray(v)) { const w = v.map(x => wrap(x, d)); return w.some((x, i) => x !== v[i]) ? w : v; }
    if (!isPlain(v)) return v;
    let copy = null;
    for (const k of Object.keys(v)) { const x = wrap(v[k], d); if (x !== v[k]) { copy = copy || Object.assign({}, v); copy[k] = x; } }
    return copy || v;
  };
  // Callbacks handed to the host (findAll predicates, event handlers) see wrapped nodes too; one wrapper
  // per callback, so figma.off() finds the handler figma.on() got.
  const callbacks = new WeakMap();
  const unwrap = (v, depth) => {
    if (!v || (typeof v !== 'object' && typeof v !== 'function')) return v;
    if (targets.has(v)) return targets.get(v);
    if (typeof v === 'function') {
      if (!callbacks.has(v)) callbacks.set(v, function () { return unwrap(v.apply(this, Array.prototype.map.call(arguments, x => wrap(x)))); });
      return callbacks.get(v);
    }
    const d = (depth || 0) + 1;
    if (d > 5) return v;
    if (Array.isArray(v)) return v.map(x => unwrap(x, d));
    if (!isPlain(v)) return v;
    const o = {};
    for (const k of Object.keys(v)) o[k] = unwrap(v[k], d);
    return o;
  };

  // After finish() the cleanup is done: something the job still creates (a missing await, a timer) would stay
  // in the file, so the stand-in refuses every call and write from then on.
  let over = false;
  const refuseWhenOver = () => { if (over) throw new Error('dry run is over: the job kept running after it returned (a missing await?)'); };
  const assign = (target, role, key, value) => {
    refuseWhenOver();
    // selection is editor state, not document content.
    if (role !== 'object' || key === 'selection' || isCreated(target)) { target[key] = unwrap(value); return; }
    let from = null;
    try { from = target[key]; } catch (e) {}
    record('set', target, { prop: key, from: from, to: value });
  };
  const skipped = (name, self, args) => name === 'detachInstance' ? self : /Async$/.test(name) ? Promise.resolve()
    : /^add/.test(name) ? String(args[0]) + '#dry-run' : name === 'editComponentProperty' ? args[0] : undefined;

  const invoke = (target, self, role, key, args) => {
    refuseWhenOver();
    const name = String(key); // the regexes below would throw on a Symbol key
    if (role === 'figma' && BLOCKED.test(name)) {
      record('call', null, { method: 'figma.' + name, to: args });
      return /Async$/.test(name) ? Promise.resolve() : undefined;
    }
    if (role === 'figma' && STYLE_MOVES.test(name)) {
      const moved = unwrap(args[0]);
      // Only a style the job created may really move; folder moves name existing folders by string.
      if (!kindOf(moved) || !isCreated(moved)) { record('call', kindOf(moved) ? moved : null, { method: 'figma.' + name, to: args }); return undefined; }
    }
    if (role === 'figma' && COMBINERS.test(name)) {
      const existing = [].concat(unwrap(args[0]) || []).filter(n => kindOf(n) === 'node' && !isCreated(n));
      if (existing.length) {
        existing.forEach(n => record('call', n, { method: 'figma.' + name, to: args }));
        if (name === 'ungroup') return wrap(existing[0].children);
        // Stand-in result so the script can go on configuring "the group"; removed with the rest.
        const standIn = /^(combineAsVariants|createComponentFromNode)$/.test(name) ? real.createComponent() : real.createFrame();
        standIn.name = '[dry run] figma.' + name;
        standIns.add(standIn); adopt(standIn);
        return wrap(standIn);
      }
      const parent = unwrap(args[1]);
      if (kindOf(parent) === 'node' && !isCreated(parent)) record('call', parent, { method: 'figma.' + name, to: args[0] });
      return wrap(track(target[key].apply(target, unwrap(args))));
    }
    if (role === 'object') {
      const mine = isCreated(target);
      const moved = name === 'appendChild' ? args[0] : name === 'insertChild' ? args[1] : null;
      const child = unwrap(moved);
      if (kindOf(child) === 'node' && mine !== isCreated(child)) {
        // An existing node moved into a created one would be deleted by the cleanup: log the move only.
        if (mine) { record('call', child, { method: name, to: self }); return undefined; }
        // A created node put into an existing parent really goes there (auto-layout props need a parent)
        // and leaves with the cleanup; the parent gets the entry.
        record('call', target, { method: name, to: moved });
        adopt(child);
        return wrap(target[key].apply(target, unwrap(args)));
      }
      if (!mine && MUTATORS.test(name)) {
        record(name === 'remove' ? 'remove' : 'call', target, name === 'remove' ? { method: name } : { method: name, to: args.length === 1 ? args[0] : args });
        return skipped(name, self, args);
      }
    }
    const out = target[key].apply(target, unwrap(args));
    return wrap(CREATORS.test(name) ? track(out) : out);
  };

  // Dummy proxy targets: the real object lives in the closure, so no proxy invariant ties the traps
  // to the host object's own properties, and every host call gets the real object as `this`.
  const proxyOf = (target, role) => {
    let p = proxies.get(target);
    if (p) return p;
    p = new Proxy({}, {
      get: (_, key) => {
        const v = target[key];
        if (typeof v === 'function') return function () { return invoke(target, p, role, key, Array.prototype.slice.call(arguments)); };
        if (role === 'figma' && v && typeof v === 'object' && !Array.isArray(v) && !kindOf(v) && typeof v.then !== 'function') return proxyOf(v, 'namespace');
        return wrap(v);
      },
      set: (_, key, value) => { assign(target, role, key, value); return true; },
      has: (_, key) => key in target,
      ownKeys: () => Reflect.ownKeys(target),
      getOwnPropertyDescriptor: (_, key) => { const d = Object.getOwnPropertyDescriptor(target, key); if (d) d.configurable = true; return d; },
    });
    proxies.set(target, p); targets.set(p, target);
    return p;
  };

  const finish = async error => {
    over = true;
    // Back to the page the job started on: a created page cannot be removed while it is current.
    try { if (real.currentPage !== startPage) await real.setCurrentPageAsync(startPage); } catch (e) {}
    const leftovers = [];
    for (let i = createdList.length - 1; i >= 0; i--) {
      const o = createdList[i];
      try { if (o.removed) continue; o.remove(); if (!standIns.has(o)) report.cleanedUp++; }
      catch (e) { try { leftovers.push(o.id + ' (' + o.name + ': ' + (e && e.message ? e.message : e) + ')'); } catch (x) { leftovers.push('an object'); } }
    }
    // A dry run promises an unchanged file: whatever stayed behind has to be named, not swallowed.
    const cleanup = leftovers.length ? 'cleanup could not remove ' + leftovers.join(', ') : null;
    report.error = error && cleanup ? error + '; ' + cleanup : error || cleanup;
    report.touched = touched.size;
    return report;
  };
  return { figma: proxyOf(real, 'figma'), finish: finish };
}

figma.ui.onmessage = async msg => {
  if (msg && msg.type === 'resize') return figma.ui.resize(280, Math.max(56, Math.min(460, Math.round(msg.height))));
  if (msg && msg.type === 'ready') { figma.ui.postMessage(context()); return restoreListen(); }
  if (msg && msg.type === 'listen') return saveListen(msg.on);
  if (!msg || msg.type !== 'job') return;
  const images = [];
  // shot(node, {scale, name}): attaches a PNG of the node to the result.
  const shot = async (node, opts) => {
    const o = opts || {};
    const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: o.scale || 1 } });
    images.push({ name: o.name || node.id.replace(/[:;]/g, '-'), bytes });
  };
  // await progress(0..1, note): step progress shown in the plugin window; awaited, it also lets Figma breathe.
  // A loop may call it for every node: the window hears of it ten times a second at most, and of the end.
  const progress = (value, note) => {
    if (value >= 1 || Date.now() - lastProgress >= 100) { lastProgress = Date.now(); figma.ui.postMessage({ type: 'progress', value, note: note || '' }); }
    return breathe();
  };
  // A script that dies halfway leaves nodes on the page that never made it into a frame.
  // Remember the page before the start and remove the newcomers after an error.
  const startPage = figma.currentPage;
  const before = new Set(startPage.children.map(n => n.id));
  const mine = ++startedJobs;
  let dry = null, outcome, alone = runningNow() === 0;
  running[msg.id] = Date.now() + (msg.timeoutMs > 0 ? msg.timeoutMs : 3600e3);
  try {
    if (msg.dryRun) dry = recorder(figma, startPage);
    lastBreath = Date.now(); lastProgress = 0;
    // What the job before set does not carry over; under a job that still runs it is left alone.
    if (alone) figma.skipInvisibleInstanceChildren = false;
    const result = await compile(msg.prelude || '', msg.code)(dry ? dry.figma : figma, shot, progress, breathe);
    outcome = { ok: true, result: result === undefined ? null : result };
  } catch (e) {
    outcome = { ok: false, error: String(e && e.message ? e.message : e) };
  }
  delete running[msg.id];
  if (startedJobs !== mine) alone = false;
  if (dry) outcome.dryRun = await dry.finish(outcome.error);
  else {
    outcome.dryRun = null;
    let cleaned = 0;
    // The newcomers on the page may be another job's: nothing tells them apart, so then nothing is removed.
    if (!outcome.ok && !alone) outcome.error += ' (bez sprzątania: w tym czasie działało inne zadanie)';
    else if (!outcome.ok) {
      try {
        for (const n of startPage.children.slice()) if (!before.has(n.id) && n.type !== 'SECTION') { n.remove(); cleaned++; }
      } catch (err) {}
    }
    if (cleaned) outcome.error += ' (posprzątano ' + cleaned + ' niedokończonych węzłów)';
  }
  const reply = { type: 'result', id: msg.id, ok: outcome.ok, result: outcome.ok ? outcome.result : undefined, error: outcome.error, images, dryRun: outcome.dryRun };
  try { figma.ui.postMessage(reply); }
  catch (e) {
    // A node (or anything else the host cannot serialise) in the return value would otherwise lose the reply.
    figma.ui.postMessage({ type: 'result', id: msg.id, ok: false, error: 'result not serialisable: ' + (e && e.message ? e.message : e), images: [], dryRun: outcome.dryRun });
  }
};
