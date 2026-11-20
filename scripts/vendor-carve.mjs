import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const checkout = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(join(checkout, 'data/conformance/examples.json'))) {
  throw new Error('usage: node scripts/vendor-carve.mjs /path/to/carve-js');
}
const root = resolve(import.meta.dirname, '..');
const dest = join(root, 'vendor/carve');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim();
mkdirSync(dest, { recursive: true });
cpSync(join(checkout, 'data/node-slots.json'), join(dest, 'node-slots.json'));
cpSync(join(checkout, 'data/ast-schema.json'), join(dest, 'ast-schema.json'));
// The tests read the render examples as a flat list; options become flags so option-dependent cases stay filterable.
const conformance = JSON.parse(readFileSync(join(checkout, 'data/conformance/examples.json'), 'utf8')).examples;
const examples = conformance
  .filter((example) => example.kind === 'render' && typeof example.expected?.html === 'string')
  .map((example) => ({ file: example.document, number: example.number, flags: Object.keys(example.options ?? {}), input: example.input, html: example.expected.html }));
writeFileSync(join(dest, 'examples.json'), JSON.stringify(examples, null, 1) + '\n');
writeFileSync(join(dest, 'SOURCE.json'), JSON.stringify({ repository: 'markup-carve/carve-js', branch: 'next2', commit }, null, 2) + '\n');
