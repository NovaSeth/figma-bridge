// node jobs/screenshots/reply-comments.mjs replies.json 110 111 …
// Posts the reply text for each comment number (replies.json: { "110": "Poprawione: …" })
// into its thread. Skips threads that already have the same reply; waits out 429s.
// The personal token is read from figma-token.txt and never printed.
import { readFileSync } from 'node:fs';
const FILE_KEY = 'DVo0quwTkrkVdS300SL1de';
const HEADERS = { 'X-Figma-Token': readFileSync(new URL('../../figma-token.txt', import.meta.url), 'utf8').trim(), 'Content-Type': 'application/json' };
const [repliesFile, ...numbers] = process.argv.slice(2);
const texts = JSON.parse(readFileSync(repliesFile, 'utf8'));
const all = (await (await fetch(`https://api.figma.com/v1/files/${FILE_KEY}/comments`, { headers: HEADERS })).json()).comments;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
for (const number of numbers) {
  const thread = all.find(c => !c.parent_id && String(c.order_id) === number);
  const text = texts[number];
  if (!thread || !text) { console.log('#' + number, 'no thread or no text'); continue; }
  if (all.some(c => c.parent_id === thread.id && c.message.startsWith(text.slice(0, 40)))) { console.log('#' + number, 'already answered'); continue; }
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}/comments`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ message: text, comment_id: thread.id }) });
    if (response.status !== 429) { console.log('#' + number, response.status); break; }
    const wait = Number(response.headers.get('retry-after')) || 20;
    console.log('#' + number, '429, waiting', wait, 's');
    await sleep(wait * 1000);
  }
  await sleep(3000);
}
