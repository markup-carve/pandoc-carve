# pandoc-carve

This `next2` branch evaluates the draft Carve 0.2 tree with a vendored `carve-js` engine. It converts Carve source and Pandoc JSON in both directions. Pandoc 3.14 is used for the format measurements and end-to-end examples. The [test-port tracker](docs/test-port-0.2.md) records the completed 0.1 test migration.

## Command line

Build with `npm ci && npm run build`, then run the branch CLI:

```bash
node dist/cli.js examples/export/article.crv -t latex -o article.tex
node dist/cli.js examples/export/article.crv -t typst -o article.typ
node dist/cli.js examples/export/article.crv -t docx -o article.docx
node dist/cli.js examples/export/article.crv -t html -o article.html
node dist/cli.js examples/export/article.crv -t epub -o article.epub
node dist/cli.js examples/export/article.crv -t pdf -o article.pdf
node dist/cli.js examples/import/paper.tex -f latex -o paper.crv
node dist/cli.js examples/import/notes.rst -f rst -o notes.crv
node dist/cli.js report.docx -f docx -o report.crv
node dist/cli.js examples/export/article.crv -t html -s -o article.html -- --toc
```

With no `-t`, Carve input produces Pandoc JSON. With a Pandoc input format, the CLI produces Carve source. `-t carve-ast-json` produces a Carve 2.0 AST JSON document instead. The CLI uses `pandoc` for formats other than JSON. PDF output requires `-o` so Pandoc can select its PDF writer from the filename. It accepts stdin with `-` and writes stdout unless `-o` is supplied. `-s` produces a standalone document, `--pandoc PATH` names the Pandoc executable, and arguments after `--` go to Pandoc verbatim. A named Carve file expands its includes from its folder; `--include-root DIR` sets an absolute containment root (and enables includes on stdin), `--no-includes` turns expansion off. See the [reference](docs/reference.md) for the details.

## Non-JS hosts (PHP, Rust)

Pass a Carve 2.0 AST JSON document from a PHP or Rust host to the CLI. The CLI validates it against the vendored 2.0 tree schema before conversion. For example, a PHP host can encode a tree and export DOCX:

```php
<?php
$tree = Carve::parse("# Report\n");
$json = Carve::encodeTree($tree);
$process = proc_open('pandoc-carve -f carve-ast-json -t docx -o report.docx', [
    0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w'],
], $pipes);
fwrite($pipes[0], $json);
fclose($pipes[0]);
$stderr = stream_get_contents($pipes[2]);
fclose($pipes[1]);
fclose($pipes[2]);
if (proc_close($process) !== 0) throw new RuntimeException($stderr);
```

`--offline --resource-root /absolute/images` embeds local image bytes from that directory and rejects image targets it cannot resolve. Use `--offline` without a root when the document has no images. The Node API also accepts a `resolveImage` callback for hosts that store image bytes elsewhere. See the [reference](docs/reference.md#offline-conversion).

## Engine

The Carve engine is the npm git dependency `@markup-carve/carve`, pinned to a carve-js `next2` commit in `package.json`. `vendor/carve` holds the engine's data the tests read at that commit: its tree schema, node slots and the render examples of its conformance data. `vendor/carve/SOURCE.json` names the commit, and a test checks it against the pin. To move the pin, change the commit in `package.json`, run `npm install`, check out carve-js at the same commit, then:

```bash
node scripts/vendor-carve.mjs /path/to/carve-js
```

## API

```js
import { carveToPandoc, pandocToCarve } from '@markup-carve/pandoc-carve';

const { doc, warnings: exportWarnings } = carveToPandoc('# Title');
const { carve, warnings: importWarnings } = pandocToCarve(doc);
```

`carveToPandocWithIncludes(source, { includeRoot, sourcePath })` from `@markup-carve/pandoc-carve/node` converts a file-backed document with its includes expanded. `carveToCarveAst`, `carveAstToPandoc`, and `pandocToCarveAst` expose the validated 2.0 tree boundary. The bridge carries typed root title, subtitle, authors, date, and bibliography metadata through Pandoc JSON. Unsupported Pandoc metadata fields produce warnings.

Pandoc `Quoted` maps to paired Carve smart quote nodes. An ordered list with Pandoc's `Example` style uses `carve-example=1` and `carve-example-delimiter=...` attributes on the Carve list; these attributes preserve the style through Carve source and Pandoc JSON. The Carve renderer does not implement Pandoc's document-wide Example counter.

## Verification and limits

`npm test` runs the full suite, including real Pandoc export and import checks for the example documents. The [format matrix](docs/roundtrip-0.2.md) measures 99 Carve probes across 17 formats and separates format-inherent loss from lost words, destinations, images, cells, math, and code. It lists every real-loss cell with its cause.

The 0.1 implementation and dependency have been removed. This branch is not a release.
