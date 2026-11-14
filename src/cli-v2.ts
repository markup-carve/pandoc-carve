#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { carveToPandocJson, pandocToCarve } from './v2.js';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write('Usage: pandoc-carve [FILE|-] [-f carve|json|FORMAT] [-t carve|json|FORMAT] [-o FILE] [--input FILE] [--output FILE]\n');
  process.exit(0);
}
const value = (...names: string[]): string | undefined => {
  const at = args.findIndex(arg => names.includes(arg));
  return at < 0 ? undefined : args[at + 1];
};
const optionValues = new Set<string>();
for (let i = 0; i < args.length; i++) if (['-f', '--from', '-t', '--to', '-o', '--output', '--input'].includes(args[i]!)) optionValues.add(args[i + 1] ?? '');
const input = value('--input') ?? args.find(arg => !arg.startsWith('-') && !optionValues.has(arg)) ?? '-';
const output = value('-o', '--output') ?? '-';
const from = value('-f', '--from') ?? (input.endsWith('.crv') || input === '-' ? 'carve' : input.split('.').at(-1) ?? 'carve');
const to = value('-t', '--to') ?? (from === 'carve' ? 'json' : 'carve');
const pandoc = (arguments_: string[], data?: Buffer): Buffer => {
  const result = spawnSync(process.env.PANDOC ?? 'pandoc', arguments_, { input: data, maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.stderr?.toString().trim() || result.error?.message || `pandoc exited ${result.status}`);
  return result.stdout;
};
try {
  const source = input === '-' ? readFileSync(0) : readFileSync(input);
  let result: Buffer;
  if (from === 'carve') {
    const json = Buffer.from(carveToPandocJson(source.toString('utf8')) + '\n');
    result = to === 'json' ? json : pandoc(['-f', 'json', '-t', to, ...(output !== '-' ? ['-o', output] : [])], json);
  } else {
    const json = from === 'json' || from === 'pandoc' ? source : pandoc(['-f', from, '-t', 'json'], source);
    result = to === 'carve' ? Buffer.from(pandocToCarve(json.toString('utf8')).carve) : to === 'json' ? json : pandoc(['-f', 'json', '-t', to, ...(output !== '-' ? ['-o', output] : [])], json);
  }
  if (output === '-') process.stdout.write(result);
  else if (to === 'carve' || to === 'json') writeFileSync(output, result);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
