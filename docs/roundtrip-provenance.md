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
node, including positions when supplied by the producing engine. Attribute
order and original marker/escape spelling are not consistently available once
source has been parsed, so this format cannot reconstruct them. That requires
an upstream exchange-AST change rather than bridge metadata.

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
