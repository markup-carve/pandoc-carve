.. raw:: carve-frontmatter:yaml

   title: A Short Carve Article
   author: Carve
   date: 2026-07-18

.. _Introduction:

Introduction
============

This is a small, hand-written Carve document. It exercises the
constructs that survive a round-trip through Pandoc into *every* writer:
emphasis, **strong** text, links, lists, tables, footnotes, math, and
raw passthrough.

Carve swaps the Markdown emphasis delimiters: ``/italic/`` is emphasis
and ``*bold*`` is strong. A footnote reference looks like this. [1]_

.. raw:: carve-tree

   {"type":"footnote","key":"note","namespace":"footnote","children":[{"type":"paragraph","children":[{"type":"text","value":"Footnotes become Pandoc "},{"type":"code","value":"Note"},{"type":"text","value":" nodes and render natively in LaTeX,"},{"type":"soft_break"},{"type":"text","value":"Typst, DOCX, and the rest."}]}]}

.. _Lists:

Lists
-----

- First item
- Second item, with *emphasis*

  - A nested item

- Third item

1. Ordered one
2. Ordered two

.. _A-table:

A table
-------

====== ======= ============
Format Binary? Text golden?
====== ======= ============
LaTeX  no      yes
Typst  no      yes
DOCX   yes     no
====== ======= ============

.. _Math-and-raw-passthrough:

Math and raw passthrough
------------------------

Inline math: :math:`e^{i\pi} + 1 = 0`.

A target-routed raw span reaches only the LaTeX writer and is dropped by
every other format: :raw-latex:`\LaTeX`. This is the pandoc-Markdown
raw-span semantics that Carve’s ``{=format}`` syntax was born from.

   A blockquote closes the tour. Every node above maps to a Pandoc AST
   node, so ``pandoc`` can then emit LaTeX, Typst, RST, DOCX, and dozens
   more.

.. [1]
   Footnotes become Pandoc ``Note`` nodes and render natively in LaTeX,
   Typst, DOCX, and the rest.
