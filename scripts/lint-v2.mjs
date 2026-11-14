import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
const bridge = readFileSync(resolve(root, 'src/v2.ts'), 'utf8');
for (const oldField of ['blockImage', 'blockMath', 'suppressAuthor', 'locatorLabel', 'locatorValue']) {
  if (new RegExp(`\\b${oldField}\\b`, 'u').test(bridge)) throw new Error(`outdated 0.2 field in active bridge: ${oldField}`);
}
const policy = readFileSync(resolve(root, 'src/url-scheme.ts'), 'utf8');
if (!policy.includes("from '../vendor/carve-v2/index.js'")) throw new Error('URL policy must use the vendored public engine export');
console.log('active 0.2 bridge lint passed');
