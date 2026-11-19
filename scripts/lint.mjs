import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
const source = resolve(root, 'src');
const oldFields = ['blockImage', 'blockMath', 'suppressAuthor', 'locatorLabel', 'locatorValue', 'rowGroups', 'listTable', 'oldText', 'newText', 'critic_substitution', 'wrapperMarker', 'taskState'];
for (const file of readdirSync(source).filter(name => name.endsWith('.ts'))) {
  const body = readFileSync(resolve(source, file), 'utf8');
  if (body.includes('@markup-carve/carve') || body.includes('legacy-index')) throw new Error(`0.1 implementation reference in ${file}`);
  for (const oldField of oldFields) {
    if (new RegExp(`\\b${oldField}\\b`, 'u').test(body)) throw new Error(`outdated 0.1 field ${oldField} in ${file}`);
  }
}
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
if (manifest.dependencies?.['@markup-carve/carve'] || manifest.devDependencies?.['@markup-carve/carve']) throw new Error('0.1 engine dependency remains');
const policy = readFileSync(resolve(root, 'src/url-scheme.ts'), 'utf8');
if (!policy.includes("from '../vendor/carve/index.js'")) throw new Error('URL policy must use the vendored public engine export');
console.log('active 0.2 source and dependency lint passed');
