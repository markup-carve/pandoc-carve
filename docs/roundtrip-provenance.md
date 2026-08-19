# Round-trip provenance envelope

`roundtrip: true` preserves Carve-only AST information in a private Pandoc
wrapper when Pandoc has no native field for it. This is an interoperability
aid for the Pandoc JSON AST path, not a promise that arbitrary Pandoc writers
will retain the data.

## Wire format (version 1)

An inline payload is a `Span`; a block payload is a `Div`. Its attribute must
match this complete shape:

```text
["", ["carve-provenance"], [["data-carve-provenance", BASE64URL_JSON]]]
```

The decoded UTF-8 JSON is:

```json
{"v":1,"kind":"comment|unknown-inline|unknown-block|citation","node":{}}
```

The sole class, sole key/value, empty id, version, recognized kind, and object
node are all required. This prevents an author-created class from being
mistaken for private data. Malformed, unknown-version, or decoded payloads over
1 MiB are ignored; ordinary Span/Div conversion retains their visible fallback
content. JSON is base64url-encoded so comment text and arbitrary Unicode need
no attribute-level escaping.

Comments use empty wrappers because comments have no visible content. Unknown
nodes carry a readable Pandoc fallback inside the wrapper. Citations carry a
native `Cite`, so citeproc still operates normally; the envelope retains the
typed locator fields that Pandoc lacks.

## Available provenance and limits

The canonical exchange AST currently exposes node fields, authored attributes,
resolved smart-punctuation kinds, typed citation locators, comment text, and
source positions. The local payload therefore stores the complete affected
node, including positions when supplied by the producing engine.

Every row below is a PART 12 schema field, not one engine's behavior - checked in
`resources/ast-schema.json`, then confirmed present in carve-js `main` (1a4c82e)
and in published `@markup-carve/carve` 0.1.4:

| property | available | how |
| --- | --- | --- |
| attribute order | yes | `attrs.order`, e.g. `[".class", "#id", "k"]` |
| escaped character | yes | its own `escaped_text` node; `pos` spans the backslash |
| smart-punctuation source | yes | `smart_punctuation` carries `value: "--"` (source) beside `glyph` and `kind: "en_dash"` (resolved) |
| bullet character | yes | `list.bulletChar` |
| thematic-break marker | yes | `thematic_break.marker` |
| ordered-list delimiter | yes | `delim`, and Pandoc's own `ListAttributes` already carries it |
| source span | yes | `pos` plus `srcByteLength` |
| **code fence character** | **no** | `code_block` is defined with `content`, `header`, `label`, `lang` and nothing for the fence, so the two spellings produce byte-identical nodes |

An earlier version of this page said attribute order and marker/escape spelling
were unavailable and needed an upstream change. That is true only of the fence
character. Recording the rest needs no exchange-AST work, and saying otherwise
told the next implementer not to attempt something already possible.

The fence character is a deliberate omission upstream rather than an oversight:
markup-carve/carve#1000 measured that no engine preserves fence LENGTH either,
and #1004 answered it by narrowing PART 11 section 6 instead of adding a field.
Whether the CHARACTER should be an author-choice field is open at
markup-carve/carve#1415. Until that is answered this bridge cannot record it,
because the tree it reads does not carry it.

Losing it is safe rather than merely tolerated. A backtick fence nested inside a
tilde fence is the case that would corrupt a document if the writer respelled
the outer fence at the same width, and it does not: the width is derived from
the content at write time, so `~~~` holding a three-backtick run comes back as a
four-backtick fence, and narrows again when the content holds no backticks. The
only thing an author loses is the character they typed.

A wrapper only works where the node can hold an `Attr`, and that set is
narrower than it looks. Measured against pandoc 3.10.2 by reading a document
exercising every block kind and inspecting which constructors carry an Attr
triple:

- **can carry it:** `Code`, `CodeBlock`, `Div`, `Header`, `Span`, `Table`
  (and `Link`, `Image`, `Figure`, table rows and cells)
- **cannot:** `Para`, `Plain`, `BulletList`, `OrderedList`, `BlockQuote`,
  `HorizontalRule`, `Str`

The properties in the table above belong almost entirely to the second group - a
bullet character to a `BulletList`, a smart-punctuation source run to a `Str`, a
marker to a `HorizontalRule`. That is why this format wraps rather than
annotates, and why the wrapped set is what it is rather than everything the
exchange AST could offer.

One of them needs no envelope at all: pandoc's `OrderedList` carries
`ListAttributes`, so `1.` versus `1)` survives natively.

Local wrappers were chosen over a positional document sidecar: they travel with
a node when a Pandoc filter reorders content. A filter that replaces the
wrapper or edits only its visible fallback intentionally breaks the exact
association; the importer then converts what remains. A filter that edits the
native `Cite` but leaves its citation envelope untouched will restore the
original Carve citation, so filters wishing to make durable citation edits must
remove the `carve-provenance` wrapper.

The envelope does not duplicate the source document and is emitted only for
nodes that need it. Version 1 kinds and semantics are stable. New incompatible
semantics require a new `v`; new kinds may be added without changing existing
ones.
