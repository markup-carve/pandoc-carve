# pandoc-carve

Bidirectional [Carve](https://github.com/markup-carve/carve) ↔ Pandoc bridge.

**Export:** converts Carve markup to Pandoc's JSON AST, unlocking every pandoc
output format for Carve documents: LaTeX, Typst, DOCX, PDF, RST, JATS, EPUB,
and dozens more. **Import:** converts anything pandoc reads (DOCX, LaTeX, RST,
Org, MediaWiki, HTML, Markdown, ...) into Carve source.

```
.crv ──parse──▶ Carve AST ──carveToPandoc()──▶ Pandoc JSON ──pandoc -f json -t X──▶ .tex / .typ / .docx / …
.docx / .tex / … ──pandoc -t json──▶ Pandoc JSON ──pandocToCarve()──▶ Carve AST ──renderCarve──▶ .crv
```

The bridge maps the parsed Carve AST node-by-node, so emphasis, admonitions,
tables with spans, footnotes, math, and raw passthrough all arrive correctly.
It also makes Carve's target-routed raw spans finally fire:
`` `\alpha`{=latex} `` becomes a Pandoc `RawInline` that the LaTeX writer emits
and every other writer drops - exactly the pandoc-Markdown semantics the syntax
was born from.

## Install

```bash
npm install @markup-carve/pandoc-carve
```

The CLI shells out to a `pandoc` executable on your PATH (3.x; tested against
3.5). Pandoc is not bundled - install it from [pandoc.org](https://pandoc.org)
or your package manager. Emitting plain JSON (`-t json`) needs no pandoc at all.

## CLI

```bash
# Carve -> LaTeX
pandoc-carve doc.crv -t latex -o doc.tex

# Carve -> Typst, PDF, DOCX ... any pandoc writer
pandoc-carve doc.crv -t typst -o doc.typ
pandoc-carve doc.crv -t pdf -o doc.pdf
pandoc-carve doc.crv -t docx -o doc.docx

# Standalone document (pandoc templates)
pandoc-carve doc.crv -t latex -s -o doc.tex

# Just the Pandoc JSON AST (no pandoc needed)
pandoc-carve doc.crv -t json

# Read from stdin, pass extra args through to pandoc after --
cat doc.crv | pandoc-carve - -t latex -- --toc

# IMPORT: anything pandoc reads -> Carve
pandoc-carve report.docx -f docx -o report.crv
pandoc-carve paper.tex -f latex -o paper.crv
pandoc-carve README.md -f markdown -o README.crv

# Import from a pre-made pandoc JSON AST (no pandoc needed)
pandoc -f rst -t json doc.rst | pandoc-carve - -f json
```

Anything Carve cannot map faithfully is reported on stderr as a
`pandoc-carve: degraded ...` warning - nothing degrades silently.

## API

```js
import { carveToPandoc, carveToPandocJson } from '@markup-carve/pandoc-carve';

const { doc, warnings } = carveToPandoc('Hello /world/!');
// doc = { 'pandoc-api-version': [1, 23, 1], meta: {...}, blocks: [...] }
// warnings = ['degraded: ...'] for lossy constructs

const json = carveToPandocJson('Hello /world/!'); // stringified doc
```

The reverse direction takes a Pandoc document (object or JSON string) and
returns Carve source, serialized by carve's own `renderCarve` (the `carve fmt`
serializer), so output formatting carries fmt's guarantees:

```js
import { pandocToCarve } from '@markup-carve/pandoc-carve';

const { carve, warnings } = pandocToCarve(pandocJsonString);
```

Round-trips are tested as a hard gate: `carve -> pandoc AST -> carve` must
render byte-identical HTML to the original source across the test corpus.
For exact restoration of attribute placement (`{.lead}` on a paragraph or
list), export with `carveToPandoc(src, { roundtrip: true })` or the CLI's
`--roundtrip` flag - it stamps wrapper divs with a `carve-block` marker the
importer uses, at the cost of that marker being visible in writer output.

Pipe the JSON to pandoc yourself:

```bash
node -e "import('@markup-carve/pandoc-carve').then(m => process.stdout.write(m.carveToPandocJson(require('fs').readFileSync('doc.crv','utf8'))))" \
  | pandoc -f json -t latex
```

## What maps to what

| Carve | Pandoc |
|-------|--------|
| `/italic/`, `*bold*`, `/*both*/` | Emph, Strong, Strong+Emph |
| `_underline_`, `~strike~`, `=highlight=` | Underline, Strikeout, Span `.mark` |
| `{^sup^}`, `{,sub,}` | Superscript, Subscript |
| Headings + `{#id .class}` attributes | Header with Attr |
| Tables incl. rowspan/colspan and captions | Table (spans inverted to pandoc's origin-cell model) |
| Footnotes (reference and inline `^[..]`) | Note |
| Math `` $`..` `` / `` $$`..` `` | Math Inline / Display |
| Images/quotes with `^ caption` lines | Figure |
| `::: note` admonitions | Div `.admonition .note` (+ title paragraph) |
| Tabs / code-group panels, grouping `[label]` | Div; each `[label]` becomes a bold caption so panels stay distinguishable (graceful degradation) |
| `` `x`{=latex} `` / ```` ```=latex ```` | RawInline / RawBlock (target-routed by pandoc) |
| `@mention`, `#tag`, `:ext[..]`, critic markup | classed Spans (documented degradation) |
| Frontmatter `title:`/`author:`/`date:`/`tags:` | Meta |

The complete node-by-node contract lives in the test goldens. Worked
input/output pairs in both directions - including how interactive constructs
degrade for print formats - are in [`examples/`](examples/README.md).

## Why a bridge, not a pandoc reader?

A native `Text.Pandoc.Readers.Carve` upstream would be a fourth full Carve
parser, written in Haskell, outside the conformance loop that keeps the three
official implementations byte-identical against the shared corpus. While the
spec is on its 0.x line and still moving, that reader would drift on pandoc's
release cadence and ship stale behavior. The bridge reuses the canonical,
conformance-tested `@markup-carve/carve` parser instead - correct by
construction, and it iterates in lockstep with the spec.

A pandoc custom Lua reader has the same drift problem (it would reimplement
the parser in Lua). Once the spec reaches 1.0 and stabilizes, contributing an
upstream reader becomes attractive - with this bridge's node map and the
conformance corpus as the oracle any port has to pass.

## Options

```js
carveToPandoc(src, {
  roundtrip: true,               // stamp attr wrappers for exact re-import
  listTable: true,               // ::: list-table -> real Table (full block cells)
  symbols: { heart: '♥' },       // resolve :name: symbols like the renderer would
});
```

CLI equivalents: `--roundtrip`, `--list-table`, `--symbols map.json`.

## Limitations

- Ordered-list delimiter style (`1.` vs `1)`) is not distinguished by the Carve
  AST (and `renderCarve` always writes `1.`); pandoc's default delimiter is
  used. Fixable only upstream (an AST `delim` field + fmt support).
- Attribute order inside `{...}` is normalized to `#id .class key=val` on
  round-trip - pandoc's Attr has fixed slots, so the author's original order
  is not representable. Semantics are unchanged.
- Import fidelity is bounded by `renderCarve` (carve fmt): the bridge hands it
  a byte-exact AST, but known fmt issues (e.g. trailing whitespace inside code
  blocks, carve-js issue 340) surface in the serialized output.
- Tier-3 visual extensions (mermaid, chart, code-group) arrive as their
  degraded block forms (code blocks / divs), same as Carve's static mode.
  `list-table` is the exception: opt in with `listTable: true` / `--list-table`
  to get a real Pandoc table with full block content per cell.

## License

MIT
