// Entry for `node --test test/`: Node 26 loads a directory argument as a module (this file) instead of
// searching it, so this imports every *.test.mjs here. `npm test` globs the files and never loads this one.
import { readdirSync } from 'node:fs';

for (const file of readdirSync(new URL('.', import.meta.url)).filter(f => f.endsWith('.test.mjs')).sort()) await import('./' + file);
