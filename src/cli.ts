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
import { carveToPandoc } from './index.js';

function usage(exitCode: number): never {
    const text = `Usage: pandoc-carve <input.crv | -> [options] [-- pandoc-args...]

Options:
  -t, --to FORMAT    output format (default: json; any pandoc writer, or pdf)
  -o, --output FILE  output file (default: stdout; required for -t pdf)
  -s, --standalone   produce a standalone document (pandoc -s)
  --pandoc PATH      pandoc executable (default: $PANDOC or "pandoc")
  -h, --help         show this help
`;
    (exitCode === 0 ? process.stdout : process.stderr).write(text);
    process.exit(exitCode);
}

interface Args {
    input: string;
    to: string;
    output?: string;
    standalone: boolean;
    pandocPath: string;
    passthrough: string[];
}

function parseArgs(argv: string[]): Args {
    const args: Args = {
        input: '',
        to: 'json',
        standalone: false,
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
        } else if (a === '-o' || a === '--output') {
            args.output = argv[++i] ?? usage(1);
        } else if (a === '-s' || a === '--standalone') {
            args.standalone = true;
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

    const source =
        args.input === '-' ? readFileSync(0, 'utf8') : readFileSync(args.input, 'utf8');

    const { doc, warnings } = carveToPandoc(source);
    for (const w of warnings) {
        process.stderr.write(`pandoc-carve: degraded: ${w}\n`);
    }
    const json = JSON.stringify(doc);

    if (args.to === 'json') {
        if (args.output) writeFileSync(args.output, json + '\n');
        else process.stdout.write(json + '\n');
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
    process.exit(result.status ?? 0);
}

main().catch((err: unknown) => {
    process.stderr.write(`pandoc-carve: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
});
