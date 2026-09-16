#!/usr/bin/env node
/**
 * pandoc-carve CLI.
 *
 *   pandoc-carve doc.crv -t latex -o doc.tex
 *   pandoc-carve doc.crv -t json            # emit Pandoc JSON, no pandoc needed
 *   cat doc.crv | pandoc-carve - -t typst -- --toc
 *
 * Everything after `--` is passed through to pandoc verbatim.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { carveAstToPandoc, carveToPandoc } from './index.js';
import { carveToPandocWithIncludes } from './includes.js';
import type { IncludeWarning } from '@markup-carve/carve';
import { hasLoss, migrationReport, type ConversionDiagnostic } from './diagnostics.js';

function usage(exitCode: number): never {
    const text = `Usage: pandoc-carve <input | -> [options] [-- pandoc-args...]

Export (Carve -> anything pandoc writes):
  -t, --to FORMAT    output format (default: json; any pandoc writer, or pdf)
  -f carve-json      input is a SERIALIZED Carve AST (spec PART 12) rather than
                     Carve source, as written by any engine's "carve --to-json"

Import (anything pandoc reads -> Carve):
  -f, --from FORMAT  input format (any pandoc reader, or json); output is Carve

Common options:
  -o, --output FILE  output file (default: stdout; required for -t pdf)
  -s, --standalone   produce a standalone document (pandoc -s; export only)
  --roundtrip        stamp export with markers so a later import restores
                     attribute placement exactly (visible in writer output)
  --no-list-table    keep ::: list-table blocks as the degraded div a processor
                     without the extension renders (export; default converts
                     them to real tables)
  --no-citations     read [@key] as an @mention rather than a citation
                     (export from Carve source; default reads citations)
  --diagnostics FILE write structured diagnostics as JSON (use - for stderr;
                     human warnings are suppressed)
  --fail-on-loss     exit 3 when lossy or unsupported diagnostics are present
  --symbols FILE     JSON map resolving :name: symbols to text (export)
  --include-root DIR containment root for includes (defaults to input folder)
  --no-includes      leave include directives literal
  --pandoc PATH      pandoc executable (default: $PANDOC or "pandoc")
  -h, --help         show this help
`;
    (exitCode === 0 ? process.stdout : process.stderr).write(text);
    process.exit(exitCode);
}

interface Args {
    input: string;
    to: string;
    from?: string;
    output?: string;
    standalone: boolean;
    roundtrip: boolean;
    listTable: boolean;
    citations: boolean;
    symbolsFile?: string;
    includeRoot?: string;
    includes: boolean;
    diagnosticsFile?: string;
    failOnLoss: boolean;
    pandocPath: string;
    passthrough: string[];
}

function parseArgs(argv: string[]): Args {
    const args: Args = {
        input: '',
        to: 'json',
        standalone: false,
        roundtrip: false,
        listTable: true,
        citations: true,
        includes: true,
        failOnLoss: false,
        pandocPath: process.env.PANDOC ?? 'pandoc',
        passthrough: [],
    };
    let i = 0;
    while (i < argv.length) {
        const a = argv[i]!;
        if (a === '--') {
            args.passthrough = argv.slice(i + 1);
            break;
        } else if (a === '-h' || a === '--help') {
            usage(0);
        } else if (a === '-t' || a === '--to') {
            args.to = argv[++i] ?? usage(1);
        } else if (a === '-f' || a === '--from') {
            args.from = argv[++i] ?? usage(1);
        } else if (a === '-o' || a === '--output') {
            args.output = argv[++i] ?? usage(1);
        } else if (a === '-s' || a === '--standalone') {
            args.standalone = true;
        } else if (a === '--roundtrip') {
            args.roundtrip = true;
        } else if (a === '--no-list-table') {
            args.listTable = false;
        } else if (a === '--no-citations') {
            args.citations = false;
        } else if (a === '--symbols') {
            args.symbolsFile = argv[++i] ?? usage(1);
        } else if (a === '--include-root') {
            args.includeRoot = argv[++i] ?? usage(1);
        } else if (a === '--no-includes') {
            args.includes = false;
        } else if (a === '--diagnostics') {
            args.diagnosticsFile = argv[++i] ?? usage(1);
        } else if (a === '--fail-on-loss') {
            args.failOnLoss = true;
        } else if (a === '--pandoc') {
            args.pandocPath = argv[++i] ?? usage(1);
        } else if (!args.input) {
            args.input = a;
        } else {
            process.stderr.write(`pandoc-carve: unexpected argument: ${a}\n`);
            usage(1);
        }
        i++;
    }
    if (!args.input) usage(1);
    return args;
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));

    // `carve` and `carve-json` are the two EXPORT inputs - Carve source, and the
    // serialized AST any engine writes with --to-json. Every other `-f` names a
    // pandoc reader, which is the import direction.
    if (args.from && args.from !== 'carve' && args.from !== 'carve-json') {
        return importToCarve(args);
    }

    const source =
        args.input === '-' ? readFileSync(0, 'utf8') : readFileSync(args.input, 'utf8');

    const symbols = args.symbolsFile
        ? (JSON.parse(readFileSync(args.symbolsFile, 'utf8')) as Record<string, string>)
        : undefined;
    const options = {
        roundtrip: args.roundtrip,
        listTable: args.listTable,
        citations: args.citations,
        symbols,
    };
    if (args.includeRoot && !path.isAbsolute(args.includeRoot)) {
        throw new Error('--include-root must be an absolute path');
    }
    let includeWarnings: IncludeWarning[] = [];
    const converted = args.from === 'carve-json'
        ? carveAstToPandoc(source, options)
        : args.includes && (args.input !== '-' || args.includeRoot)
            ? carveToPandocWithIncludes(source, {
                includeRoot: path.resolve(args.includeRoot ?? path.dirname(args.input)),
                ...(args.input === '-' ? {} : { sourcePath: path.resolve(args.input) }),
            }, options)
            : carveToPandoc(source, options);
    if ('includeWarnings' in converted) {
        includeWarnings = converted.includeWarnings as IncludeWarning[];
    }
    const { doc, warnings, diagnostics } = converted;
    for (const warning of includeWarnings) {
        const root = args.includeRoot ?? (args.input === '-' ? undefined : path.dirname(path.resolve(args.input)));
        const file = warning.file && root
            ? `[include-root]/${path.relative(root, warning.file)}`
            : args.input;
        process.stderr.write(`pandoc-carve: ${file}:${warning.line}:${warning.column} ${warning.rule} - ${warning.message}\n`);
    }
    report(args, warnings, diagnostics, 'carve');
    const json = JSON.stringify(doc);

    if (args.to === 'json') {
        if (args.output) writeFileSync(args.output, json + '\n');
        else process.stdout.write(json + '\n');
        if (args.failOnLoss && hasLoss(diagnostics)) process.exitCode = 3;
        return;
    }

    const { spawnSync } = await import('node:child_process');
    const pandocArgs = ['-f', 'json'];
    if (args.to === 'pdf') {
        if (!args.output) {
            process.stderr.write('pandoc-carve: -t pdf requires -o <file.pdf>\n');
            process.exit(1);
        }
        // pandoc has no "pdf" writer name; the .pdf output path selects it.
    } else {
        pandocArgs.push('-t', args.to);
    }
    if (args.standalone) pandocArgs.push('-s');
    if (args.output) pandocArgs.push('-o', args.output);
    pandocArgs.push(...args.passthrough);

    const result = spawnSync(args.pandocPath, pandocArgs, {
        input: json,
        stdio: ['pipe', 'inherit', 'inherit'],
        maxBuffer: 256 * 1024 * 1024,
    });
    if (result.error) {
        const code = (result.error as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
            process.stderr.write(
                `pandoc-carve: pandoc executable not found ("${args.pandocPath}"). Install pandoc or use --pandoc PATH / $PANDOC. (-t json needs no pandoc.)\n`,
            );
            process.exit(2);
        }
        throw result.error;
    }
    process.exit(result.status || (args.failOnLoss && hasLoss(diagnostics) ? 3 : 0));
}

/** Reverse direction: pandoc-readable input -> Carve source. */
async function importToCarve(args: Args): Promise<void> {
    let json: string;
    if (args.from === 'json') {
        json = args.input === '-' ? readFileSync(0, 'utf8') : readFileSync(args.input, 'utf8');
    } else {
        const { spawnSync } = await import('node:child_process');
        const pandocArgs = ['-f', args.from!, '-t', 'json', ...args.passthrough];
        const input = args.input === '-' ? readFileSync(0) : readFileSync(args.input);
        const result = spawnSync(args.pandocPath, pandocArgs, {
            input,
            encoding: 'utf8',
            maxBuffer: 256 * 1024 * 1024,
        });
        if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
            process.stderr.write(
                `pandoc-carve: pandoc executable not found ("${args.pandocPath}"). Install pandoc or use --pandoc PATH / $PANDOC. (-f json needs no pandoc.)\n`,
            );
            process.exit(2);
        }
        if (result.status !== 0) {
            process.stderr.write(result.stderr ?? '');
            process.exit(result.status ?? 1);
        }
        json = result.stdout;
    }

    const { pandocToCarve } = await import('./index.js');
    const { carve, warnings, diagnostics } = pandocToCarve(json);
    const reportDiagnostics = args.from === 'json' ? diagnostics : [
        ...diagnostics,
        {
            code: 'fidelity-unverified',
            direction: 'pandoc-to-carve' as const,
            class: 'unsupported' as const,
            severity: 'error' as const,
            fidelity: 'dropped' as const,
            confidence: 'fallback' as const,
            message: 'Fidelity before the Pandoc JSON boundary was not reported; dropped is a conservative worst-case release-gate classification',
        },
    ];
    report(args, warnings, reportDiagnostics, 'pandoc-json');
    if (args.output) writeFileSync(args.output, carve);
    else process.stdout.write(carve);
    if (args.failOnLoss && hasLoss(reportDiagnostics)) process.exitCode = 3;
}

function report(args: Args, warnings: string[], diagnostics: ConversionDiagnostic[], sourceFormat: string): void {
    if (args.diagnosticsFile !== undefined) {
        const json = JSON.stringify(migrationReport(diagnostics, sourceFormat), null, 2) + '\n';
        if (args.diagnosticsFile === '-') process.stderr.write(json);
        else writeFileSync(args.diagnosticsFile, json);
        return;
    }
    for (const warning of warnings) process.stderr.write(`pandoc-carve: degraded: ${warning}\n`);
    for (const diagnostic of diagnostics) {
        if (diagnostic.code === 'fidelity-unverified') {
            process.stderr.write(`pandoc-carve: dropped: ${diagnostic.message}\n`);
        }
    }
}

main().catch((err: unknown) => {
    process.stderr.write(`pandoc-carve: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
});
