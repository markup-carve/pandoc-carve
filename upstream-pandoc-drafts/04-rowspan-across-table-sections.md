https://github.com/jgm/pandoc/issues/new?template=feature_request.md

Suggested title: A table cell cannot span a head/body or body/foot boundary, and the clip is silent

**Describe your proposed improvement and the problem it solves.**

In the Pandoc AST a table's head, bodies and foot are separate row collections:

```
Table attr caption colspecs
      (TableHead attr [Row])
      [TableBody attr rowheadcols [Row] [Row]]
      (TableFoot attr [Row])
```

A `rowSpan` counts rows inside one of those collections, so a cell cannot span
from the last head row into the first body row. HTML can express that, because
its grid is flat and `rowspan` simply counts `<tr>` elements.

The case is ordinary rather than exotic: a stub column whose label covers the
header band and the first data row, which is common in statistical tables and in
anything converted out of Word.

**What happens today.** Pandoc drops the span without saying so. With pandoc
3.10.2:

```html
<table>
  <thead><tr><th rowspan="2">Region</th><th>Q1</th></tr></thead>
  <tbody><tr><td>10</td></tr></tbody>
</table>
```

read as HTML and written straight back as HTML gives

```html
<table><thead><tr><th>Region</th><th>Q1</th></tr></thead>
<tbody><tr><td>10</td><td></td></tr></tbody></table>
```

The `rowspan` attribute is gone and the body row has gained an empty cell. The
output is well-formed and the loss is invisible: nothing in the AST, the HTML or
the exit status records that a span was discarded.

**Two questions, and I think they are separable.**

1. Should the table model be able to represent such a span at all? That is a
   `pandoc-types` change and may well not be worth it.
2. Failing that, should the HTML reader report the clip? A warning would let a
   converting pipeline notice, which today it cannot.

I would be happy with a clear "no" to the first if the second is on the table,
and I would be happy to write the reader warning.

**Describe alternatives you've considered.**

A bridge has three options and all three lie about the document. Clipping drops
the span, moving the boundary turns a header row into a body row, and duplicating
the content invents a cell that the author did not write.

Ours clips, inserts an empty cell to keep the grid rectangular, and emits a
diagnostic with a stable code so a consumer can detect it programmatically rather
than by eyeballing the output. That is the least-bad of the three, not a good
answer, and every bridge that meets this has to pick one unaided.
