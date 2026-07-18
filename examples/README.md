# Examples

Worked examples of the pandoc-carve bridge in both directions. Every output
file here is **generated** from a source file by `npm run examples:build` and
pinned by a golden test (`test/examples.test.mjs`), so it can never silently
drift out of sync with the converter.

## Layout

```
examples/
  export/            Carve -> Pandoc -> other formats
    article.crv      SOURCE (hand-written)
    article.json     Pandoc JSON AST      (carveToPandocJson; compact, no pandoc needed)
    article.native   Pandoc native AST    (pandoc -t native)
    article.md       GitHub Markdown       (pandoc -t gfm)
    article.tex      LaTeX                 (pandoc -t latex)
    article.typ      Typst                 (pandoc -t typst)
    article.rst      reStructuredText      (pandoc -t rst)
    interactive.crv  SOURCE - tabs, code-group, spoiler, mermaid, math
    interactive.*    same target set, showing how each degrades
  import/            other formats -> Pandoc -> Carve
    paper.tex        SOURCE (LaTeX)
    paper.crv        GENERATED (pandocToCarve)
    notes.rst        SOURCE (reStructuredText)
    notes.crv        GENERATED (pandocToCarve)
```

Edit the `SOURCE` files; never edit the generated ones by hand.

## Regenerating

```bash
npm run examples:build
```

Then commit the changed outputs together with the source and converter change
that caused them. The golden test fails with
`examples/... is stale - run npm run examples:build` if you forget.

## Which outputs are committed, and why

- **Text writers only** - `.json`, `.native`, `.tex`, `.typ`, `.rst`, `.crv`.
  They are diffable, so a converter change shows up as a readable diff in review.
- **No binary writers** - `.docx`, `.pdf`, `.epub` are intentionally absent.
  They are non-deterministic (embedded timestamps), binary (undiffable), and
  large. Produce them on demand instead:

  ```bash
  pandoc-carve examples/export/article.crv -t docx -o article.docx
  pandoc-carve examples/export/article.crv -t pdf  -o article.pdf
  ```

- **`.json` needs no pandoc** - it comes straight from `carveToPandocJson`, so
  that golden is always regenerated and checked. It is kept compact (one line)
  to stay small; read the `.native` golden for the human-readable AST. The other
  export targets and every import target go through a real `pandoc` executable;
  when `pandoc` is not on `PATH` the build and the test skip them (only `.json`
  is verified).

## Interactive constructs degrade, they do not vanish

`interactive.crv` is the worked proof that Carve's graceful-degradation promise
holds through this bridge. pandoc-carve runs **no** renderer extensions, so every
script-dependent construct maps to its static form:

| Construct | Through pandoc-carve |
| --- | --- |
| Tabs / code-group | container `Div`; each panel's `[label]` becomes a **bold caption** so panels stay distinguishable; code panels keep their language |
| Spoiler / details | `Div` carrying the quoted title as a caption; body shown (hiding is meaningless offline) |
| Mermaid / charts | fenced code block - the **diagram source is preserved**, never dropped |
| Math (`` $`...` ``) | native inline/display math the LaTeX/Typst writers render |
| Footnotes, links, cross-refs | native Pandoc equivalents |

The one thing that is *dropped*, matching the reference `carveToHtml` renderer
exactly, is a `[label]` on an individual code fence inside a `code-group` (the
panel language survives; the label does not). That is a carve-core behavior, not
a bridge decision - pandoc-carve mirrors whatever the reference engine does.

## Pandoc version

The pinned outputs track **pandoc 3.5** (the version the test suite targets).
A different pandoc major/minor can shift text output (e.g. LaTeX escaping); if
`npm run examples:build` produces a diff you did not expect, check your local
`pandoc --version` first.
