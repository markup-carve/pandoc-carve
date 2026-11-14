import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const checkout = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(join(checkout, 'v2/src/index.ts'))) {
  throw new Error('usage: node scripts/vendor-carve-v2.mjs /path/to/carve-js');
}
const root = resolve(import.meta.dirname, '..');
const dest = join(root, 'vendor/carve-v2');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim();
const esbuild = join(checkout, 'node_modules/.bin/esbuild');
const tsc = join(checkout, 'node_modules/.bin/tsc');
if (!existsSync(esbuild) || !existsSync(tsc)) throw new Error('run npm ci in the carve-js checkout first');
mkdirSync(dest, { recursive: true });
execFileSync(esbuild, [join(checkout, 'v2/src/index.ts'), '--bundle', '--platform=node', '--format=esm', '--target=node22', `--outfile=${join(dest, 'index.js')}`], { stdio: 'inherit' });
const scratch = mkdtempSync(join(tmpdir(), 'carve-v2-types-'));
try {
  const emitted = spawnSync(tsc, ['--declaration', '--emitDeclarationOnly', '--allowImportingTsExtensions', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--outDir', scratch, '--rootDir', join(checkout, 'v2/src'), '--skipLibCheck', join(checkout, 'v2/src/index.ts')], { encoding: 'utf8' });
  if (!existsSync(join(scratch, 'index.d.ts'))) throw new Error(`declaration emit failed:\n${emitted.stderr}\n${emitted.stdout}`);
  const types = join(dest, 'types');
  rmSync(types, { recursive: true, force: true });
  cpSync(scratch, types, { recursive: true });
  const rewrite = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) rewrite(file);
      else if (file.endsWith('.d.ts')) writeFileSync(file, readFileSync(file, 'utf8').replaceAll(".ts'", ".js'").replaceAll('.ts"', '.js"'));
    }
  };
  rewrite(types);
  writeFileSync(join(dest, 'index.d.ts'), "export * from './types/index.js';\n");
  writeFileSync(join(dest, 'SOURCE.json'), JSON.stringify({ repository: 'markup-carve/carve-js', branch: 'next2', commit, entry: 'v2/src/index.ts' }, null, 2) + '\n');
  if (emitted.status !== 0) process.stderr.write('Upstream 0.2 declaration emit reported type errors; emitted declarations were retained.\n');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
