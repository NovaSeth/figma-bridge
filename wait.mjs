// Waits for an event from Figma (a new comment), prints it as one JSON line and exits.
// Run in the background by a Claude session, it wakes the session the moment something arrives.
import { baseUrl, readToken } from './paths.mjs';

const H = { 'X-Bridge-Token': readToken() };
for (;;) {
  try {
    const r = await fetch(baseUrl() + '/events', { headers: H });
    if (r.status === 200) { console.log(JSON.stringify(await r.json())); process.exit(0); }
    if (r.status !== 204) { console.error('bridge: HTTP ' + r.status); process.exit(1); }
  } catch (e) { await new Promise(ok => setTimeout(ok, 3000)); }
}
