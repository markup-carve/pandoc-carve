# pandoc-carve

Carve → Pandoc bridge. Converts [Carve](https://github.com/markup-carve/carve)
markup to Pandoc's JSON AST, unlocking every pandoc output format for Carve
documents: LaTeX, Typst, DOCX, PDF, RST, JATS, EPUB, and dozens more.

```
.crv ──parse──▶ Carve AST ──carveToPandoc()──▶ Pandoc JSON ──pandoc -f json -t X──▶ .tex / .typ / .docx / …
```

## Why not `pandoc -f djot`?

Carve is not valid Djot. Pandoc's Djot reader reads Carve's `/italic/` as
literal text and remaps `_underline_` to emphasis. This bridge maps the parsed
Carve AST node-by-node instead, so emphasis, admonitions, tables with spans,
footnotes, math, and raw passthrough all arrive correctly.

It also makes Carve's target-routed raw spans finally fire: `` `\alpha`{=latex} ``
becomes a Pandoc `RawInline` that the LaTeX writer emits and every other writer
drops - exactly the pandoc-Markdown semantics the syntax was born from.

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
| `` `x`{=latex} `` / ```` ```=latex ```` | RawInline / RawBlock (target-routed by pandoc) |
| `@mention`, `#tag`, `:ext[..]`, critic markup | classed Spans (documented degradation) |
| Frontmatter `title:`/`author:`/`date:`/`tags:` | Meta |

The complete node-by-node contract lives in the test goldens.

## Limitations

- One direction only (Carve → Pandoc). No pandoc → Carve yet.
- Ordered-list delimiter style (`1.` vs `1)`) is not distinguished by the Carve
  AST; pandoc's default delimiter is used.
- Tier-3 visual extensions (mermaid, chart, code-group, list-table) arrive as
  their degraded block forms (code blocks / divs), same as Carve's static mode.

## License

MIT
