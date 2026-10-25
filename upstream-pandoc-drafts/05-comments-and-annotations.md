https://github.com/jgm/pandoc/discussions/new?category=ideas

Suggested title: A common representation for source comments and review annotations

Two things get called "comments" and Pandoc treats them very differently. Keeping
them apart is most of this post.

**1. A non-rendering source comment.** An author's private note that must survive
a conversion and appear in no output. Pandoc has no representation for it, so a
bridge drops it, makes it visible, or invents a private marker.

**2. A review annotation.** An insertion, a deletion, or a note attached to a
range, usually with an author and a date. Pandoc does have conventions here, from
DOCX.

Our own language has both, which is why the split is not hypothetical:

```
Hidden from output      text %% a line comment
                        a {% an inline comment %} b

Visible as markup       {+inserted+}  {-deleted-}  {~old~>new~}
                        {#a note about this#}
```

**Where Pandoc already works.** The DOCX comment convention round-trips properly.
With pandoc 3.10.2, this Markdown

```markdown
[reviewed text]{.comment-start id="7" author="A" date="2026-01-01"}[]{.comment-end id="7"}
```

written to `.docx` produces a real `word/comments.xml` entry carrying the author
and date, and reading that file back with `--track-changes=all` reproduces the
same paired spans. The convention is documented, implemented in both directions,
and worth building on.

The flag is load-bearing, which is itself worth noting: without it the reader
drops the comment and emits an empty document, with no warning. Two pandoc
invocations differing only in a flag give "the comment survived" and "there was
no comment", and only one of them says anything.

**Where it does not.** The annotation vocabulary outside DOCX loses meaning.
Reading HTML and writing it straight back with 3.10.2:

```html
<p>a <ins>added</ins> <del>removed</del></p>
```

comes back as

```html
<p>a <u>added</u> <del>removed</del></p>
```

`<ins>` becomes `Underline`, so an insertion is now presentational underlining -
the fact that someone added that text is gone. `<del>` fares better as
`Strikeout`. A `<span class="critic-comment">` survives, because an unrecognized
class on a `Span` is simply carried.

So an editing-oriented format can express a tracked insertion, and a conversion
through Pandoc silently reduces it to formatting, in the same way the DOCX path
would not.

**What I would like to ask.**

- Could the `insertion` / `deletion` span convention that the DOCX reader already
  uses be documented as the general one, so the HTML reader can emit it too
  instead of `Underline`?
- Is there appetite for a documented convention for concept 1, the invisible
  comment? Something explicitly non-rendering, for example a `Span` or `Div`
  carrying a reserved class that every writer is expected to skip. The property
  that matters for bridges is that it survives the JSON AST and filters even
  where the target writer renders nothing.

We have implemented a private marker for concept 1 in our own bridge: a
versioned, size-capped payload on an attributed `Span`/`Div`, emitted only in
round-trip mode so ordinary conversion is unchanged. It works, and that is the
problem - every bridge that needs this invents a different class name, and none
of them interoperate. One documented convention would cost less than the sum of
those.
