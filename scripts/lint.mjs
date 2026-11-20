import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
const source = resolve(root, 'src');
const oldFields = ['blockImage', 'blockMath', 'suppressAuthor', 'locatorLabel', 'locatorValue', 'rowGroups', 'listTable', 'oldText', 'newText', 'critic_substitution', 'wrapperMarker', 'taskState'];
for (const file of readdirSync(source).filter(name => name.endsWith('.ts'))) {
  const body = readFileSync(resolve(source, file), 'utf8');
  if (body.includes('legacy-index')) throw new Error(`0.1 implementation reference in ${file}`);
  for (const oldField of oldFields) {
    if (new RegExp(`\\b${oldField}\\b`, 'u').test(body)) throw new Error(`outdated 0.1 field ${oldField} in ${file}`);
  }
}
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
// The registry still serves the 0.1 engine under this name; the 0.2 engine is a carve-js next2 commit.
if (!/^github:markup-carve\/carve-js#[0-9a-f]{40}$/u.test(manifest.dependencies?.['@markup-carve/carve'] ?? '')) throw new Error('the engine must be a carve-js commit pin');
if (manifest.devDependencies?.['@markup-carve/carve']) throw new Error('the engine is a runtime dependency');
const policy = readFileSync(resolve(root, 'src/url-scheme.ts'), 'utf8');
if (!policy.includes("from '@markup-carve/carve'")) throw new Error('URL policy must use the public engine export');
console.log('active 0.2 source and dependency lint passed');
