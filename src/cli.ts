#!/usr/bin/env node
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { Diagnostic } from '@markup-carve/carve';
import { carveAstToPandoc, carveToPandoc, pandocToCarve, pandocToCarveAst } from './convert.js';
import { carveToPandocWithIncludes } from './node.js';
import { preparePandocForWriter } from './prepare.js';
import { finishOdtPageBreaks } from './odt.js';

const usage = `Usage: pandoc-carve [FILE|-] [options] [-- pandoc-args...]

  -f, --from FORMAT    carve (default for .crv and stdin), carve-ast-json, json, or any Pandoc reader
  -t, --to FORMAT      carve, carve-ast-json, json (default for Carve input), any Pandoc writer, or pdf
  -o, --output FILE    output file (default: stdout; required for -t pdf)
  -s, --standalone     produce a standalone document (Pandoc -s)
  --include-root DIR   absolute containment root for includes (default: the input file's folder)
  --no-includes        leave include directives unexpanded
  --offline            prevent Pandoc from fetching resources
  --resource-root DIR  absolute directory containing offline images
  --pandoc PATH        Pandoc executable (default: $PANDOC or "pandoc")
  --fail-on-loss       exit 3 when the conversion reports a loss
  -h, --help           show this help

Arguments after -- go to Pandoc verbatim.
`;

interface Args {
  input?: string;
  from?: string;
  to?: string;
  output?: string;
  standalone: boolean;
  includeRoot?: string;
  includes: boolean;
  failOnLoss: boolean;
  offline: boolean;
  resourceRoot?: string;
  pandocPath: string;
  passthrough: string[];
}

const fail = (message: string): never => { process.stderr.write(`pandoc-carve: ${message}\n${usage}`); process.exit(1); };

function parseArgs(argv: string[]): Args {
  const args: Args = { standalone: false, includes: true, failOnLoss: false, offline: false, pandocPath: process.env.PANDOC ?? 'pandoc', passthrough: [] };
  const value = (i: number): string => argv[i + 1] ?? fail(`${argv[i]} needs a value`);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--') { args.passthrough = argv.slice(i + 1); break; }
    else if (arg === '-h' || arg === '--help') { process.stdout.write(usage); process.exit(0); }
    else if (arg === '-f' || arg === '--from') args.from = value(i++);
    else if (arg === '-t' || arg === '--to') args.to = value(i++);
    else if (arg === '-o' || arg === '--output') args.output = value(i++);
    else if (arg === '--input') args.input = value(i++);
    else if (arg === '-s' || arg === '--standalone') args.standalone = true;
    else if (arg === '--include-root') args.includeRoot = value(i++);
    else if (arg === '--no-includes') args.includes = false;
    else if (arg === '--offline') args.offline = true;
    else if (arg === '--resource-root') args.resourceRoot = value(i++);
    else if (arg === '--pandoc') args.pandocPath = value(i++);
    else if (arg === '--fail-on-loss') args.failOnLoss = true;
    else if (arg.startsWith('-') && arg !== '-') fail(`unknown option: ${arg}`);
    else if (args.input === undefined) args.input = arg;
    else fail(`unexpected argument: ${arg}`);
  }
  return args;
}

const argv = process.argv.slice(2);
if (argv.length === 0) { process.stderr.write(usage); process.exit(1); }
const args = parseArgs(argv);
const input = args.input ?? '-';
const output = args.output ?? '-';
const from = args.from ?? (input.endsWith('.crv') || input === '-' ? 'carve' : input.split('.').at(-1) ?? 'carve');
const to = args.to ?? (from === 'carve' || from === 'carve-json' || from === 'carve-ast-json' ? 'json' : 'carve');

const pandoc = (arguments_: string[], data?: Buffer): Buffer => {
  const result = spawnSync(args.pandocPath, arguments_, { input: data, maxBuffer: 256 * 1024 * 1024 });
  if (result.error) { const error = new Error(`pandoc not found: ${result.error.message}`); Object.assign(error, { status: 2 }); throw error; }
  if (result.status !== 0) {
    const error = new Error(result.stderr?.toString().trim() || `pandoc exited ${result.status}`);
    Object.assign(error, { status: result.status ?? 1 });
    throw error;
  }
  return result.stdout;
};

const displayFile = (file: string | undefined, root: string): string => {
  if (file === undefined) return input;
  const relative = path.relative(root, path.resolve(root, file));
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ? '[outside-include-root]' : `[include-root]/${relative.split(path.sep).join('/')}`;
};

try {
  if (to === 'pdf' && output === '-') throw new Error('pandoc-carve: -t pdf requires -o <file.pdf>');
  if (args.resourceRoot && !args.offline) throw new Error('--resource-root requires --offline');
  if (args.resourceRoot && !path.isAbsolute(args.resourceRoot)) throw new Error('--resource-root must be an absolute path');
  if (args.offline && args.passthrough.length) throw new Error('--offline does not allow Pandoc passthrough arguments');
  if (args.offline && /^https?:\/\//iu.test(input)) throw new Error('--offline does not allow remote input');
  if (from !== 'carve' && (args.includeRoot !== undefined || !args.includes)) throw new Error('--include-root and --no-includes only apply to Carve source input');
  if (args.includeRoot !== undefined && !path.isAbsolute(args.includeRoot)) throw new Error('--include-root must be an absolute path');
  const source = input === '-' ? readFileSync(0) : readFileSync(input);
  let result: Buffer;
  const warnings: string[] = [];
  const includeLines: string[] = [];
  let includeLoss = false;
  let json: Buffer;
  if (from === 'carve') {
    const text = source.toString('utf8');
    let converted: { doc: unknown; warnings: string[] };
    if (args.includes && (input !== '-' || args.includeRoot !== undefined)) {
      const includeRoot = path.resolve(args.includeRoot ?? path.dirname(path.resolve(input)));
      const expanded = carveToPandocWithIncludes(text, { includeRoot, ...(input === '-' ? {} : { sourcePath: path.resolve(input) }) });
      const root = realpathSync(includeRoot);
      for (const entry of expanded.includeDiagnostics as Diagnostic[]) {
        includeLines.push(`pandoc-carve: ${displayFile(entry.file, root)}: ${entry.code} - ${entry.message}\n`);
        if (entry.severity !== 'hint') includeLoss = true;
      }
      if (expanded.suppressedIncludeDiagnostics) includeLines.push(`pandoc-carve: ${expanded.suppressedIncludeDiagnostics} additional include diagnostic(s) suppressed\n`);
      converted = expanded;
    } else converted = carveToPandoc(text);
    warnings.push(...converted.warnings);
    json = Buffer.from(JSON.stringify(converted.doc) + '\n');
  } else if (from === 'carve-json' || from === 'carve-ast-json') {
    const parsed = JSON.parse(source.toString('utf8')) as { type?: string; document?: unknown };
    if (parsed?.type !== 'document' && parsed?.document === undefined) throw new Error('not a Carve AST document');
    const schema = JSON.parse(readFileSync(new URL('../vendor/carve/ast-schema.json', import.meta.url), 'utf8'));
    const validator = new Ajv2020({ strict: false });
    const validate = validator.compile(schema);
    if (!validate(parsed)) throw new Error('invalid Carve AST 2.0 JSON');
    const tree = parsed.type === 'document' ? parsed : parsed.document;
    const converted = carveAstToPandoc(tree as Parameters<typeof carveAstToPandoc>[0]);
    warnings.push(...converted.warnings);
    json = Buffer.from(JSON.stringify(converted.doc) + '\n');
  } else if (from === 'json' || from === 'pandoc') {
    json = source;
  } else {
    json = pandoc(['-f', from, '-t', 'json', ...(args.offline ? ['--sandbox'] : []), ...args.passthrough], source);
    warnings.push(`fidelity-unverified: Pandoc ${from} reader may normalize source content`);
  }
  if (to === 'carve') {
    const converted = pandocToCarve(json.toString('utf8'));
    warnings.push(...converted.warnings);
    result = Buffer.from(converted.carve);
  } else if (to === 'carve-ast-json') {
    const converted = pandocToCarveAst(json.toString('utf8'));
    warnings.push(...converted.warnings);
    result = Buffer.from(JSON.stringify(converted.ast) + '\n');
  } else if (to === 'json') result = json;
  else {
    const prepared = preparePandocForWriter(JSON.parse(json.toString('utf8')), to, { offline: args.offline, ...(args.resourceRoot ? { resourceRoot: args.resourceRoot } : {}) });
    const preparedJson = JSON.stringify(prepared);
    const patchOdt = to === 'odt' && preparedJson.includes('CarvePageBreak');
    const written = pandoc(['-f', 'json', ...(to === 'pdf' ? [] : ['-t', to]), ...(args.standalone ? ['-s'] : []), ...(args.offline ? ['--sandbox'] : []), ...(output !== '-' ? ['-o', output] : []), ...args.passthrough], Buffer.from(preparedJson));
    if (patchOdt) {
      result = finishOdtPageBreaks(output === '-' ? written : readFileSync(output));
      if (output !== '-') writeFileSync(output, result);
    } else result = written;
  }
  if (output === '-') process.stdout.write(result);
  else if (to === 'carve' || to === 'carve-ast-json' || to === 'json') writeFileSync(output, result);
  for (const line of includeLines) process.stderr.write(line);
  for (const warning of warnings) process.stderr.write(`pandoc-carve: degraded: ${warning}\n`);
  if (args.failOnLoss && (warnings.length || includeLoss)) process.exitCode = 3;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 1;
}
