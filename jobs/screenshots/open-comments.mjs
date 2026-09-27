// Lists unresolved comment threads of the FLibrus file into out/open-comments.json.
// The personal token is read from figma-token.txt and never printed.
import { readFileSync, writeFileSync } from 'node:fs';
const FILE_KEY = 'DVo0quwTkrkVdS300SL1de';
const token = readFileSync(new URL('../../figma-token.txt', import.meta.url), 'utf8').trim();
const response = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}/comments`, { headers: { 'X-Figma-Token': token } });
const all = (await response.json()).comments || [];
const replies = all.filter(c => c.parent_id);
const open = all.filter(c => !c.parent_id && !c.resolved_at).map(c => ({
  id: c.id, number: c.order_id, createdAt: c.created_at, node: c.client_meta?.node_id || null,
  offset: c.client_meta?.node_offset || null, text: c.message,
  replies: replies.filter(r => r.parent_id === c.id).map(r => r.message),
}));
writeFileSync(new URL('../../out/open-comments.json', import.meta.url), JSON.stringify(open, null, 1));
console.log('all comments:', all.length, 'open threads:', open.length);
