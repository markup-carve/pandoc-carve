# pandoc-carve

Bidirectional [Carve](https://github.com/markup-carve/carve) and Pandoc bridge.
It exports Carve through Pandoc's writers and imports any format handled by a
Pandoc reader.

```text
.crv -> Carve AST -> Pandoc JSON -> LaTeX, Typst, DOCX, PDF, EPUB, ...
DOCX, LaTeX, RST, ... -> Pandoc JSON -> Carve AST -> .crv
```

The bridge maps parsed nodes instead of converting through HTML. It preserves
structure such as tables with spans, footnotes, math, admonitions, attributes,
and target-routed raw content when Pandoc can represent it.

## Install

```bash
npm install @markup-carve/pandoc-carve
```

The CLI requires Pandoc 3.x on `PATH` for formats other than JSON. CI currently
tests Pandoc 3.10.2. Pandoc is not bundled.

## CLI

```bash
# Export
pandoc-carve doc.crv -t latex -o doc.tex
pandoc-carve doc.crv -t typst -o doc.typ
pandoc-carve doc.crv -t docx -o doc.docx
pandoc-carve doc.crv -t pdf -o doc.pdf

# Import
pandoc-carve report.docx -f docx -o report.crv
pandoc-carve paper.tex -f latex -o paper.crv

# Emit or consume Pandoc JSON without invoking pandoc
pandoc-carve doc.crv -t json
pandoc -f rst -t json doc.rst | pandoc-carve - -f json
```

Anything that cannot be mapped faithfully produces a diagnostic. Use
`--diagnostics report.json` for the versioned JSON report and `--fail-on-loss`
to return exit code 3 when a conversion degrades or drops content. Imports
through a Pandoc reader other than `-f json` also return 3 because fidelity
before the Pandoc JSON boundary cannot be verified.

Named input files expand contained includes by default, rooted at their own
directory. Use `--no-includes` to keep directives literal. Standard input
expands includes only when `--include-root` is supplied.

The [CLI reference](docs/reference.md#cli) covers standalone documents,
additional Pandoc arguments, includes, serialized Carve AST input, and every
diagnostic option.

## API

```js
import {
  carveToPandoc,
  carveToPandocJson,
  pandocToCarve,
} from '@markup-carve/pandoc-carve'

const exported = carveToPandoc('Hello /world/!')
const json = carveToPandocJson('Hello /world/!')
const imported = pandocToCarve(json)
```

Each direction returns structured diagnostics alongside its output. Node.js
hosts can use `carveToPandocWithIncludes` from the `/node` entry point for
contained file expansion and dependency tracking.

Use `carveToCarveAst` to serialize source, `carveAstToPandoc` to convert a
serialized Carve tree, and `pandocToCarveAst` for the reverse direction. These
functions consume the versioned AST defined by the Carve specification, not an
implementation-specific runtime tree.

## Round trips

With round-trip metadata enabled, the test suite requires
`carve -> Pandoc AST -> carve` to render equivalent normalized HTML across the
corpus apart from an explicit known-lossy list:

```js
const result = carveToPandoc(source, { roundtrip: true })
```

The CLI equivalent is `--roundtrip`. Private Span and Div metadata preserves
comments, attribute placement, typed citations, and future Carve nodes through
Pandoc JSON. Other writers may expose or discard that metadata. See the
[provenance envelope](docs/roundtrip-provenance.md) for its format and safety
rules.

## Fidelity and limitations

Pandoc's AST does not represent every Carve construct, and output formats have
their own limits. The bridge reports those cases rather than silently dropping
them. Highlights include:

- underline, highlight, and custom attributes depend on target-format support;
- complex Carve table structure may be normalized by a writer;
- grouped UI constructs such as tabs degrade to labeled blocks;
- raw target content only survives in matching writers;
- comments and attribute placement require round-trip metadata.

Dangerous URL schemes such as `javascript:` are blanked and reported. The
[URL policy](docs/reference.md#dangerous-url-schemes-are-blanked) documents the
exact behavior. The [mapping and limitations reference](docs/reference.md#what-maps-to-what)
contains the node table and per-format limits; the [options section](docs/reference.md#options)
covers API configuration.

## Development

Contributor setup, tests, and maintenance commands are in the
[development guide](docs/development.md).
