= Introduction
This is a small, hand-written Carve document. It exercises the
constructs that survive a round-trip through Pandoc into #emph[every]
writer: emphasis, #strong[strong] text, links, lists, tables, footnotes,
math, and raw passthrough.

Carve swaps the Markdown emphasis delimiters: `/italic/` is emphasis and
`*bold*` is strong. A footnote reference looks like
this.#footnote[Footnotes become Pandoc `Note` nodes and render natively
in LaTeX, Typst, DOCX, and the rest.]

== Lists
- First item
- Second item, with #emph[emphasis]
  - A nested item
- Third item

#block[
#set enum(numbering: "1.", start: 1)
+ Ordered one
+ Ordered two
]

== A table
#figure(
  align(center)[#table(
    columns: 3,
    align: (auto,auto,auto,),
    table.header([Format], [Binary?], [Text golden?],),
    table.hline(),
    [LaTeX], [no], [yes],
    [Typst], [no], [yes],
    [DOCX], [yes], [no],
  )]
  , kind: table
  )

== Math and raw passthrough
Inline math: $e^(i pi) + 1 = 0$.

A target-routed raw span reaches only the LaTeX writer and is dropped by
every other format: . This is the pandoc-Markdown raw-span semantics
that Carve’s `{=format}` syntax was born from.

#quote(block: true)[
A blockquote closes the tour. Every node above maps to a Pandoc AST
node, so `pandoc` can then emit LaTeX, Typst, RST, DOCX, and dozens
more.
]
