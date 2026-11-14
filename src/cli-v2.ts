#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { carveAstToPandoc, carveToPandoc, pandocToCarve } from './v2.js';

const args = process.argv.slice(2);
const usage = 'Usage: pandoc-carve [FILE|-] [-f carve|carve-json|json|FORMAT] [-t carve|json|FORMAT] [-o FILE] [--fail-on-loss]\n';
if (args.includes('--help') || args.includes('-h')) { process.stdout.write(usage); process.exit(0); }
if (args.length === 0) { process.stderr.write(usage); process.exit(1); }
const value = (...names: string[]): string | undefined => {
  const at = args.findIndex(arg => names.includes(arg));
  return at < 0 ? undefined : args[at + 1];
};
const optionValues = new Set<string>();
for (let i = 0; i < args.length; i++) if (['-f', '--from', '-t', '--to', '-o', '--output', '--input'].includes(args[i]!)) optionValues.add(args[i + 1] ?? '');
const input = value('--input') ?? args.find(arg => arg === '-' || (!arg.startsWith('-') && !optionValues.has(arg))) ?? '-';
const output = value('-o', '--output') ?? '-';
const from = value('-f', '--from') ?? (input.endsWith('.crv') || input === '-' ? 'carve' : input.split('.').at(-1) ?? 'carve');
const to = value('-t', '--to') ?? (from === 'carve' || from === 'carve-json' ? 'json' : 'carve');
const failOnLoss = args.includes('--fail-on-loss');
const pandoc = (arguments_: string[], data?: Buffer): Buffer => {
  const result = spawnSync(process.env.PANDOC ?? 'pandoc', arguments_, { input: data, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) { const error = new Error(`pandoc not found: ${result.error.message}`); Object.assign(error, { status: 2 }); throw error; }
  if (result.status !== 0) throw new Error(result.stderr?.toString().trim() || `pandoc exited ${result.status}`);
  return result.stdout;
};
try {
  const source = input === '-' ? readFileSync(0) : readFileSync(input);
  let result: Buffer;
  const warnings: string[] = [];
  let json: Buffer;
  if (from === 'carve') {
    const converted = carveToPandoc(source.toString('utf8'));
    warnings.push(...converted.warnings);
    json = Buffer.from(JSON.stringify(converted.doc) + '\n');
  } else if (from === 'carve-json') {
    const parsed = JSON.parse(source.toString('utf8')) as { type?: string };
    if (parsed?.type !== 'document') throw new Error('not a Carve AST document');
    const converted = carveAstToPandoc(parsed as Parameters<typeof carveAstToPandoc>[0]);
    warnings.push(...converted.warnings);
    json = Buffer.from(JSON.stringify(converted.doc) + '\n');
  } else if (from === 'json' || from === 'pandoc') {
    json = source;
  } else {
    json = pandoc(['-f', from, '-t', 'json'], source);
    warnings.push(`fidelity-unverified: Pandoc ${from} reader may normalize source content`);
  }
  if (to === 'carve') {
    const converted = pandocToCarve(json.toString('utf8'));
    warnings.push(...converted.warnings);
    result = Buffer.from(converted.carve);
  } else if (to === 'json') result = json;
  else result = pandoc(['-f', 'json', '-t', to, ...(output !== '-' ? ['-o', output] : [])], json);
  if (output === '-') process.stdout.write(result);
  else if (to === 'carve' || to === 'json') writeFileSync(output, result);
  for (const warning of warnings) process.stderr.write(`pandoc-carve: degraded: ${warning}\n`);
  if (failOnLoss && warnings.length) process.exitCode = 3;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 1;
}
