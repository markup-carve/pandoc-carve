https://github.com/jgm/pandoc/discussions/new?category=ideas

Suggested title: Optional source ranges and provenance in the Pandoc AST

Pandoc's AST is excellent for semantic conversion, but tools built around it cannot generally relate a node back to its original source range. This affects diagnostics, language servers and source-to-source tools.

For example, a filter can report that an image is missing alt text, but after reading Markdown through Pandoc it cannot reliably point to the original line and columns.

A related case, from the bridge side: our own AST *does* retain deliberate source spellings - which bullet character was typed, whether a dash came from `--`, whether a character was escaped, the order the parts of an attribute were written in. What we cannot do is carry any of it through Pandoc, because the nodes that hold those spellings (`BulletList`, `Str`, `HorizontalRule`, `Para`) are exactly the ones with no `Attr`.

Would there be interest in an optional, standardized provenance mechanism carrying at least:

```text
source file
start line/column
end line/column
```

I would expect it to be opt-in and safe for readers, filters and writers to ignore. It should not require every filter to maintain exact positions after editing; stale or absent provenance is preferable to pretending it is always valid.

Possible designs include node attributes where available, a document-level side table with stable node IDs, or an annotated AST/API outside the normal JSON representation.

We have since implemented the first of those privately, and the experience is worth offering: local attribute wrappers **travel with their node when a filter reorders content**, which a positional side table does not. We started out preferring the side table on the grounds that it leaves the tree untouched, and changed our minds once filters were in the picture. The remaining weakness is that a wrapper only works where a node can hold an `Attr`, which is the gap described above.

I would still like to understand what would fit Pandoc without burdening ordinary conversion.
