#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { carveToPandocJson, pandocToCarve } from './v2.js';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write('Usage: pandoc-carve [--from carve|pandoc] [--input FILE] [--output FILE]\n');
  process.exit(0);
}
const value = (name: string): string | undefined => { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; };
const from = value('--from') ?? 'carve';
const input = value('--input') ?? '-';
const output = value('--output') ?? '-';
try {
  const source = input === '-' ? readFileSync(0, 'utf8') : readFileSync(input, 'utf8');
  const result = from === 'carve' ? carveToPandocJson(source) + '\n' : from === 'pandoc' ? pandocToCarve(source).carve : (() => { throw new Error(`Unknown --from value: ${from}`); })();
  if (output === '-') process.stdout.write(result); else writeFileSync(output, result);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
