# AGENTS.md

figma-bridge exposes the Figma file open in Figma desktop through the MCP server `figma-bridge`. Every tool goes
through the Claude Bridge plugin window, which must stay open. Setup is in README.md (Polish).

## Tools

| Tool | Params (default) | Returns |
|---|---|---|
| `figma_status` | `file` (switch the session to another open file: key or part of the name) | lines `plugin:`, `file: "name" key`, `other open files: "name" key; …` (when the plugin is open in several), `page:`, `selection: id TYPE "name"; …` (≤10), `project:`, `listen: on\|on, idle\|off`, `comment polling:`; `queued jobs:` / `new comments:` when > 0; `link:` when the repo's `.figma-bridge.json` was refused |
| `figma_inspect` | `target`=selection \| page \| file \| node id \| name; `depth`=3 (0–50); `maxLines`=200 (1–2000) | outline, one line per node |
| `figma_find` | `query` (required; case-insensitive substring or `/regex/flags`, matches the name or a TEXT node's content); `type` (`TEXT` or `FRAME,INSTANCE`); `page`; `limit`=30 (1–1000) | one line per match, all pages |
| `figma_library` | `kind` (required: variables \| styles \| components); `filter` (substring or `/regex/`) | local tokens, styles or components |
| `figma_run` | `code` or `file`; `dryRun`=false; `timeoutMs`=120000; `step`; `project`; `noPrelude`=false | one-line JSON; `isError` when `ok` is false |
| `figma_screenshot` | `target`=selection \| node id \| name; `scale`=1 (0.01–4); `maxSize`=1024 (px, longest side) | `id TYPE "name" W×H <png path>` per node + an inline PNG each; 4 nodes per call |
| `figma_plan` | `tasks` (replaces the plan; `[{text,state}]` or strings); `add`; `mark` (text prefix or `#N`); `state` todo \| active \| done; `clearDone` | `[x]` done / `[>]` active / `[ ]` todo lines, or `plan is empty` |
| `figma_comments` | `wait`=0 (0–25 s); `replyTo` + `text` to reply | one line per new comment, `no new comments`, or `replied in thread <id> (comment <newId>)` |

A failing tool answers `error: …` with `isError`. Plugin closed: `the Claude Bridge plugin is not open in Figma …`
(`… in file <key> …` when the session works in a named file).

## Rules

1. Look before editing: `figma_status`, then `figma_inspect` / `figma_find` / `figma_library`. Target nodes by id.
2. Bulk or destructive edits: `figma_run` with `dryRun: true` first. Check `counts`, `touched` and `entries` (the full
   report is at `dryRunReport`), then run the same code for real.
3. Check the result with `figma_screenshot`.
4. A shared pattern is fixed in the component, variable or style, not in each instance.
5. Keep answers small: return ids, counts and short strings from jobs, and narrow with `depth`, `maxLines`, `limit`,
   `filter`.
6. `step` marks an existing plan entry: active before the run, done after success, left active after a failure.
   A dry run never marks it.
7. When `figma_status` says `listen: on`, the comment agent handles new top-level comments in every file the plugin
   is open in. Do not act on those from `figma_comments` too.
8. The plugin may be open in several files (`other open files:`). Every tool works in one of them: the file chosen
   with `figma_status {file}` (or `FIGMA_FILE` in the environment of `mcp.mjs`, `run.mjs`, `plan.mjs`), else the
   file the plugin was opened in last. Check `file:` before editing. The plan is kept per file. A session started
   with `FIGMA_FILE` stays in that file: `figma_status {file}` is refused there.

## Jobs (`figma_run` code, `run.mjs` scripts)

- The code is the body of an async function with `figma`, `shot(node, {scale = 1, name})` (PNG path added to
  `images`), `progress(value 0..1, note)` and `breathe()`. `return` a JSON-serializable value: return `node.id`,
  not the node.
- A job runs on the editor's thread: a long loop freezes Figma. `await breathe()` (or `await progress(…)`) inside
  the loop hands control back for a moment, at most every 50 ms. `progress(…)` without `await` only reports.
- A `//# Label` line names the job in the plugin window.
- Prelude: `prelude.js`, then the preludes of the project that lists the session's file (or of `project`), then the job.
  Each is nested in its own scope, so the job may redeclare a helper name. `noPrelude: true` sends no helpers at all.
  `figma_inspect`, `figma_find`, `figma_library` and `figma_screenshot` use `prelude.js` only.
- `file`: an absolute path, else looked up in the project's `jobsDir`, then the project folder, then the session's
  working directory.
- Plugin sandbox code in this repo avoids optional chaining (`?.`) and object spread (`{...o}`). Write jobs the same way.
- The plugin uses `documentAccess: dynamic-page`: use `figma.getNodeByIdAsync`, `getMainComponentAsync`,
  `figma.setCurrentPageAsync`, and load a page (`page.loadAsync()`, `figma.loadAllPagesAsync()`, `usePage`) before
  reading it.
- A real run that throws removes only the new top-level nodes on its start page (sections stay). Every other
  write stays. When another job ran at the same time nothing is removed (the error says so): the newcomers may
  be that job's.
- A timeout answers `ok: false`, but a job the plugin already started keeps running. `timeoutMs` may exceed
  5 minutes (the server keeps the answer alive). A job whose window closed before answering fails within
  seconds; it may have run in part.
- `progress()` reaches the window ten times a second at most, so calling it for every node is fine.
- An answer over 20000 chars saves the full result to `<data>/out/result-<ms>.json`. The answer then carries
  `resultFile`, `resultChars` and the first 10000 chars in `result`.

Without MCP: `node run.mjs <job.js> [timeoutMs] [--dry-run] [--step "…"] [--project name] [--prelude file]... [--no-prelude] [--file key]`
prints the server's answer as indented JSON and exits 0 (ok), 1 (failed or no server) or 2 (bad arguments).
`--file` (also in `plan.mjs`): a file key, or a part of the name of a file the plugin is open in.

Answer: `{"ok":true,"result":…,"images":["<data>/out/x.png"],"dryRun":{…},"dryRunReport":"<data>/out/dry-run-<id>.json","project":"name"}`.
Empty fields are left out. On failure: `{"ok":false,"error":"…"}`.

Dry-run report: `{dryRun:true, counts:{set,call,remove}, touched, created:{TYPE:n}, entries:[{op,id,name,type,prop,method,from,to}], truncated, cleanedUp, error}`.
The answer has the first 20 entries and the file holds up to 200. Counts are always complete. Values are summarised:
strings to 80 chars, objects as JSON to 120 chars, nodes as `{id,name}`.

## Helpers (prelude.js)

```
hex(h) → {r,g,b}                                   '#RRGGBB' | 'RRGGBB' | '#RGB'
solid(color, opacity?) → [SolidPaint]              color: hex string or {r,g,b}
await usePage(nameOrRegExp, {create = false}) → PageNode      made current, so loaded
all(node) → [node, ...node.findAll()]
texts(node) → TextNode[]                            node itself included
byName(match, root = figma.currentPage) → node[]    match: exact name | RegExp | predicate; root excluded
one(match, root = figma.currentPage) → node | null
await loadFonts(nodeOrNodes) → FontName[]          every font in the subtrees, mixed text included
await variable(name, collectionName?) → Variable | null
await paintVar(nameOrVariable) → [SolidPaint]      bound to a COLOR variable
await component(name) → ComponentNode | ComponentSetNode | null   any page
await instance(name, variant?) → InstanceNode      variant 'Size=Small, State=On' | {Size: 'Small'}; unset props keep the default variant's
setProp(inst, name, value) → inst                   short name: 'Label' finds 'Label#12:3'; throws on an unknown name
cloneVariant(set, source, name) → ComponentNode    copy inside the set with componentPropertyReferences restored
frame(name, direction = 'VERTICAL', props = {}) → FrameNode   hugs, no fill, props assigned last
await text(chars, {family = 'Inter', style = 'Regular', size, fill}) → TextNode   font loaded
await inspect(target, {depth = 3, maxLines = 200, instances = false}) → string    target may also be a node or node[]
await find(query, {type, page, limit = 30}) → string
await library(kind = 'variables', {filter, limit = 300}) → string
```

## Output conventions

Outline line: `TYPE "name" id W×H [@x,y | abs@x,y] [H|V|GRID wrap gap… p… justify=… align=…] [text="…" style:…] [sizing] [fill=…] [stroke=… swN] [r…] [fx=…] [opN%] [rotN] [→"Main"{…}] [{defs}] [hidden] [locked] [+N]`

- Two spaces of indent per level. `[+N]`: N children not listed, because the depth ran out or the node is an instance
  below the target (its inside belongs to the component; the helper's `instances: true` opens it).
- `@x,y` only where the position is not set by an auto-layout parent. `abs@` means absolute inside auto-layout.
- `gap16` is a number, `gap=space/md` a bound variable, `gap=auto` space-between. Padding: `p16` (all sides),
  `p16/12` (vertical/horizontal), `p1/2/3/4` (top/right/bottom/left), `p=var,var` when variables are bound.
- `hug×fill` is horizontal×vertical sizing, shown unless both are fixed.
- Paints: variable name (`color/surface`, `@50%` for paint opacity), `style:<name>`, `#RRGGBB[AA]`, `gradient-linear`,
  `image`, `mixed`. Radius: `r12`, `r=radius/md`, `r1/2/3/4`. Effects: `shadow(x,y,blur[,spread],#hex)`, `inner-shadow(…)`, `blur(r)`,
  `bg-blur(r)` or `style:<name>`.
- TEXT: `text="…"` (≤60 chars, left out when it equals the name), then `style:<text style>` or
  `Family/Style/Size lh… ls…`.
- INSTANCE: `→"Main"{Variant=Value,Label="…"}`. Variant values are always shown; other properties only when they
  differ from the default.
- COMPONENT / COMPONENT_SET: `{Axis=A|B,Label:text,Icon:bool,Slot:swap}`.
- Numbers are rounded to 0.1 and strings clipped with `…`. A capped list ends with `… N more (maxLines N)`,
  `(limit N)` or `(use filter)`.

Other formats:
```
find        1:40 TEXT "Preview" text="…" · Screens › Inbox
variables   Tokens [Light|Dark] 5
              color/surface #FFFFFF | #121213      (one value when every mode agrees)
              color/accent →palette/blue
styles      TEXT 2
              Body/M Inter/Regular/15 lh20
components  Components 1                           (page name, count)
              1:18 SET "Button" {Kind=Primary|Secondary,Label:text="OK"} — Main actions.
comments    #12 id=<id> [reply-to=<root id>] @author [node=<id>] [file=<key> when not the open file]: text (≤500 chars)
```

## Pitfalls

- `findAll()` never returns the node itself, so an audit can miss the root's own fills. Use `all(node)`. `byName` and
  `one` skip the root too, and search the current page unless given a root.
- `clone()` of a variant loses `componentPropertyReferences`, and instances of the copy then ignore `setProperties`.
  Use `cloneVariant(set, source, name)`.
- A wrong selector (a name that matches more than meant, a stale id, the wrong page) edits the wrong nodes. Dry-run
  first and compare `touched` and `entries` with what you meant to change.
- `mark: "#12"` is thread 12 exactly; any other `mark` is the start of a step's text and marks every step that
  starts with it in the file's plan.
- In a dry run, a read after an intercepted write returns the old value, and `shot()` exports the unchanged file.
  Code that branches on its own writes takes a different path than it will for real.
- In a dry run, finish before returning and `await` everything. Calls after the end fail with `dry run is over`.
  Writes outside the document (`figma.clientStorage`) are not intercepted.
- A TEXT component property writes into a text layer: `await loadFonts(inst)` before `setProp`. Setting `characters`
  needs the font loaded as well (`text()` does it).
- A name target resolves to the first match (a page, then the current page, then all pages). `figma_inspect` names
  the other matches in a closing note; `figma_screenshot` does not. Prefer ids.
- `find` skips hidden layers inside instances.
- `figma.skipInvisibleInstanceChildren = true` makes searches in component-heavy files many times faster; it is
  reset when a job starts while no other job runs. `findAllWithCriteria({ types })` beats `findAll(predicate)`; a `findAll` inside a
  `findAll` predicate is quadratic.
- A job for a file without a plugin window waits for one until its timeout; it never runs in another file.
- Figma does not destroy a removed component set: it leaves the document (`parent` is null) but `removed` stays
  false, `getNodeByIdAsync` still finds it, and a layer bound to one of its properties refuses `remove()`. To
  know whether a node is still in the file, walk `parent` up to the document.
- `replyTo` must be a thread's root comment id. For a reply event, use its `reply-to` value. Each comment event is
  handed out once, to `figma_comments` or `wait.mjs`, whichever asks first.

## Working on this repo

- Plain ESM, Node >= 20, zero runtime dependencies (Playwright is optional, used by `tools/sheet.mjs` only). Code,
  comments and tests in English; plugin UI copy in Polish.
- `code.js`, `prelude.js` and job files (`tools/*.js`) run in the plugin sandbox. Keep them free of optional chaining
  and object spread. `PRELUDE_SEPARATOR` exists in both `code.js` and `project.mjs`; keep the two equal.
- `npm test` runs `node --test test/*.test.mjs` against a mock Plugin API (`test/mock-figma.mjs`), a temporary
  `BRIDGE_HOME` and fake `claude` / `launchctl` on `PATH`. Tests need no network and no Figma, and never run the
  installer against the real home, LaunchAgents or MCP config. Deploying (`node install.mjs` on the real home)
  restarts the user's server: do it when the user asks for it.
- A fix or a feature starts with a test that fails for the right reason. Wait on a condition, not on a fixed
  time, when a test depends on a child process. `test/security.test.mjs` holds the security contract by OWASP
  Top 10 heading: every request needs the token, plugin-given names stay inside `data/out`, the comment agent's
  session reads job files from its own folder only (`BRIDGE_FILE_ROOT`), stays in the comment's file
  (`FIGMA_FILE`) and links no project, `link.mjs` never replaces a project from elsewhere.
- The plugin window may be older than the server (it is replaced only when reopened): the server keeps
  answering a window without `?win=`, and `prelude.js` must not assume what a newer `code.js` passes in.
- The mock (`test/mock-figma.mjs`) is only as true as what was checked against Figma. After a change to
  `code.js` or `prelude.js`, run `node run.mjs tools/smoke-test.js --dry-run` on an open file too; when Figma
  behaves differently, teach the mock first (a test goes red), then fix the code.
- Output size is part of the contract: tests hold the tool list to ≤ 2900 chars and put budgets on inspect, find
  and library output. Keep tool descriptions and answers short.
- The repo stays generic: no project names, file keys, prompts or fixtures from a real project. Project material
  lives in `<home>/projects/`.
- `node install.mjs` deploys the checkout to `<home>/app` and restarts the server; `--verify` lists drift. Reopen the
  plugin after changing `code.js`, `ui.template.html` or `manifest.json`.
- Figma imports the plugin from the checkout (`manifest.json` here), by the owner's choice: not from `<home>/app`.
  The installer writes the plugin window, `ui.html`, next to it (bridge token inside, 0600, git-ignored); the
  server cannot, launchd having no access to `~/Documents`. Do not delete that file as a leftover, and run the
  installer in tests only from a copy of the checkout (`test/install.test.mjs` does), or the test's token
  replaces the real window.

## Server (server.mjs, 127.0.0.1 only; every request carries `X-Bridge-Token`)

| Request | Does |
|---|---|
| `GET /next?win=<id>&file=<key>` | a plugin window's long poll (25 s): answers a job `{id, code, label, dryRun, prelude, timeoutMs}` or 204 |
| `POST /hello {win, openedAt, fileKey, fileName}` | a window names its file; the window opened last is the current one |
| `POST /result {id, ok, result, error, images, dryRun}` | a window's answer to a job |
| `POST /job {code, label, timeoutMs, dryRun, prelude, file}` | runs a job; answers its result, 504 on timeout, 400 for an unknown `file`; after 4 minutes the headers go out and the body starts with spaces |
| `GET /status` | `{connected, pluginSeenMsAgo, queued, pendingEvents, file, files (when several are open), comments, listen, agent}` |
| `GET /plan[?file=<key>]`, `POST /plan {file, tasks, add, mark, state, clearDone}` | the plan: all of it, one file's, or a change to one file's |
| `GET /window?file=<key>` | `{tasks, listen}`: what a plugin window shows, asked every 2 s |
| `GET /listen`, `POST /listen {on}` | the comment-mode toggle |
| `GET /events` | long poll (25 s) for new comment events; waiters queue |
| `POST /comments/reply {fileKey, commentId, text}` | answers in a thread with the token that reaches the file |

- A plugin window is known by its id. An open window always has a poll waiting (it asks again at once, also
  while a job runs), so one without a poll for 10 s counts as closed; a window without `?win=` (older code) has
  the id `''`.
- A job with `file` goes to a window of that file only. MCP tools and `run.mjs` read `/status` first and send
  the job to the file it named. A job a window took and closed with is answered with an error within seconds.
- State lives in `<home>/data`: `plan.json`, `events.jsonl`, `seen-comments.json`, `state.json`. Each is read
  tolerantly on start: a file cut off by a crash must not stop the server.
