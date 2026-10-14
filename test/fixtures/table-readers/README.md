These JSON fixtures are the output of Pandoc 3.11 reading its own Typst and
LaTeX exports of this table:

```text
|= Head A |= Head B |
| a | < |
| c | d |
```

The Typst reader returns a Table inside an alignment Div and a captionless
Figure. The LaTeX reader returns a blank row in place of the cell containing
`a`; neither its text nor its colspan reaches the bridge. The tests preserve
the reader-returned structure and also exercise the installed Pandoc readers.

`markdown-multiline-softbreak.json` is Pandoc 3.11 reading the multiline table
from its own `test/tables.markdown`: each wrapped cell line arrives as a
`SoftBreak`. `markdown-grid-hardbreak.json` is a grid table whose first body
cell holds a backslash hard break (`one\` then `two`).
