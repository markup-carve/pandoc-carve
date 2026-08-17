# Interactive constructs and graceful degradation

pandoc-carve runs **no** renderer extensions - it maps the parsed core
AST to Pandoc. So every script-dependent construct (tabs, code-group,
spoiler, mermaid, math) degrades to its static form on the way to LaTeX,
Typst, DOCX, and the rest. Content and structure survive; only the
interaction is dropped. This file is the worked proof - compare it
against the generated `interactive.md` / `interactive.tex` / `.typ` /
`.native` beside it.

## Tabs

A `[label]` on each panel is a grouping identifier. With a tabs
extension it becomes a clickable tab button; here, with no extension, it
degrades to a visible caption so a print reader can still tell the
panels apart.

<div class="admonition tabs">

<div class="admonition tab">

**Installation**

Run `npm install @markup-carve/pandoc-carve`.

</div>

<div class="admonition tab">

**Usage**

Call the *converter* on your `.crv` source.

</div>

</div>

## Code group

Same grouping mechanism, code panels instead of prose. Each fence keeps
its language (so syntax highlighting survives every writer); the panels
stack.

<div class="admonition code-group">

``` js
export default { port: 3000 };
```

``` json
{ "port": 3000 }
```

</div>

## Spoiler

A quoted title survives as a caption; the “hide until revealed”
interaction is meaningless offline, so the body is simply shown.

<div class="admonition spoiler">

**Answer**

The hidden *answer* is 42.

</div>

## Disclosure

<div class="admonition details">

**Show details**

A disclosure carries its title and body through as a labelled block.

</div>

## Mermaid and math

The diagram source is never lost - it stays a fenced code block that a
Markdown host can re-render, and a build step can pre-render to an image
for PDF.

```
graph TD; A[Carve] --> B[Pandoc]; B --> C[LaTeX];
```

Inline math keeps its source too:
$`\sum_{i=1}^{n} i = \frac{n(n+1)}{2}`$.
