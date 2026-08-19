/**
 * Carve AST -> Pandoc JSON AST.
 *
 * Walks the SERIALIZED AST that PART 12 of the Carve spec defines - the shape
 * `spec/resources/ast-schema.json` pins, as written by any engine's
 * `--to-json` - and emits a Pandoc document (api-version 1.23.1). It is not the
 * runtime tree of any particular implementation: `src/ast-json.ts` maps that on
 * the way in, so every node type and field name switched on below is spec
 * surface. Anything that cannot be mapped faithfully degrades to a classed
 * Span/Div and reports a warning - nothing degrades silently.
 */

import type { CarveAstDocument } from './ast-json.js';
import * as P from './pandoc.js';
import { readRowGroups } from './row-groups.js';
import { diagnostic, type ConversionDiagnostic } from './diagnostics.js';
import { provenanceAttr } from './provenance.js';

// The Carve AST is plain data; we type the parts we read.
interface CNode {
    type: string;
    [key: string]: unknown;
}

interface CAttrs {
    id?: string;
    classes?: string[];
    keyValues?: Record<string, string>;
}

export interface ConvertResult {
    doc: P.PandocDoc;
    warnings: string[];
    diagnostics: ConversionDiagnostic[];
}

export interface ConvertOptions {
    /**
     * Stamp attr-wrapper Divs with a `carve-block` key-value marker so the
     * reverse direction can restore the attrs onto the inner block. Off by
     * default: the marker would otherwise leak into pandoc writer output
     * (e.g. `carve-block="paragraph"` on an HTML div).
     */
    roundtrip?: boolean;
    /**
     * Resolve `:name:` symbols to replacement text (mirrors the renderer's
     * symbols map). Unresolved symbols degrade to a classed Span + warning.
     */
    symbols?: Record<string, string>;
    /**
     * Convert `::: list-table` blocks to real Pandoc tables (the listTable
     * extension's semantics) instead of the degraded Div-of-lists form.
     * Pandoc cells hold full blocks, so nothing is flattened.
     *
     * ON by default, because the REVERSE direction writes a list-table
     * unprompted: `pandocToCarve` reaches for it whenever a pandoc table has a
     * cell holding blocks or row-head columns, which a pipe table cannot spell.
     * With this off, that table came back as a `Div` of nested lists - the
     * bridge lost, on the way in, a construct it had itself chosen on the way
     * out. Set it false to get the literal `Div` a processor without the
     * extension enabled would render.
     */
    listTable?: boolean;
    /**
     * Parse Carve source to the exchange AST's `children`, for the one place a
     * conversion has to read source rather than a tree: block content in
     * metadata (`abstract: |`), whose value is Carve markup inside a YAML
     * string.
     *
     * Supplied as a hook rather than imported, because this module converts a
     * SERIALIZED AST from any engine and has no engine of its own. Without it
     * a block scalar is reported and skipped, which is what it always did.
     */
    parseBlocks?: (source: string) => unknown[];
}

interface Ctx {
    warnings: string[];
    diagnostics: ConversionDiagnostic[];
    footnoteDefs: Record<string, CNode[]>;
    /**
     * Crossref target id -> the inline content a `</#id>` resolves to.
     *
     * Populated in pass 1 (`collectCrossrefTargets`, run before any block is
     * converted), from two kinds of target: a heading's own children (id
     * explicit or slugged), and a numbered figure/table caption's computed
     * "Label N" text (id from its own `{#id}`).
     */
    crossrefTargets: Map<string, CNode[]>;
    /**
     * A heading's RENDERED text, folded to lower case, to its id.
     *
     * A COLLAPSED reference reaches a heading by that text - `[Some Heading][]`
     * links to it with no definition anywhere, matched case-insensitively -
     * which is resolution the engine performs after the parse, so the node the
     * bridge receives still carries an empty `href`. Without this map every one
     * of them was reported as a missing definition and emitted as literal
     * source, so the link was simply gone.
     *
     * The FULL form is deliberately not here: `[text][Some Heading]` does NOT
     * reach a heading, measured on the engine - it needs a definition like any
     * other reference.
     */
    headingIdByText: Map<string, string>;
    /**
     * The crossref targets that are NUMBERED CAPTIONS rather than headings.
     *
     * `</#id>` resolves against both, and only one of them survives the
     * crossing. A heading resolves by id, which is stable. A numbered caption
     * resolves because it holds a `#` PLACEHOLDER - and pandoc has no
     * placeholder, so the caption must go out with a literal number, after
     * which it is an ordinary caption and the crossref pointing at it resolves
     * to nothing. Re-reading `</#fig-sun>` therefore rendered the crossref as
     * its own source text, with the link gone.
     *
     * Such a crossref is written as a plain link to the same id instead. It
     * renders identically - the number is already resolved into the text - and
     * it is stable, because nothing about a plain link depends on the target
     * still being numbered. See markup-carve/carve#758 for the wider question
     * of resolution results crossing a boundary.
     */
    captionTargets: Set<string>;
    /** true while emitting blocks of a tight list item */
    tight: boolean;
    /**
     * True while a crossref's target heading is being inlined.
     *
     * A crossref resolves ONE LEVEL: the link text is the target heading's
     * content with any crossref inside it dropped. `# A </#a>` - a heading
     * referencing its own id - is the corpus case, and without this the
     * resolution re-enters itself until the stack runs out.
     */
    inCrossref: boolean;
    /**
     * How many captions of each kind have been numbered so far.
     *
     * `^ Figure #: text` asks for a literal number in the caption; the engine
     * keeps an independent sequence per LABEL, not per element kind, so
     * `Figure #`, `Listing #`, `Figure #` on three figures numbers them
     * Figure 1, Listing 1, Figure 2. The parse tree
     * carries only the `caption_number` PLACEHOLDER - the value is assigned at
     * render time - so a consumer that wants the number has to keep the count
     * itself.
     */
    captionCounts: Map<string, number>;
    /** The caption LABEL currently being converted, for `caption_number`. */
    captionKind: string | undefined;
    /**
     * True while converting a PANEL of a composite figure, or anything inside
     * one.
     *
     * PART 9 §4c: the group is ONE numbering unit, so a panel draws nothing
     * from the document sequence - and neither does anything the panel
     * contains. A `#` in a panel caption "stays LITERAL, the visible failure
     * this language prefers to a silent one". Suppressing the DRAW matters as
     * much as suppressing the digit: a panel that consumed a number would
     * shift every later caption in the document by one.
     */
    inPanel: boolean;
    roundtrip: boolean;
    symbols: Record<string, string>;
    listTable: boolean;
    /**
     * Notes closed so far, which is what pandoc's `citationNoteNum` counts.
     *
     * Pandoc's markdown reader stamps every `Cite` with the note number in
     * force where it stands: a citation in running text before any note gets 1,
     * one standing after two notes gets 3, and one INSIDE a note gets that
     * note's own number - the counter moves when the note CLOSES, not when it
     * opens. Reproducing that here is what makes a citation survive
     * pandoc -> Carve -> pandoc unchanged; the field is pandoc's own
     * bookkeeping, not authored content, so there is nothing in the Carve AST
     * to carry and nothing to add to it.
     */
    noteCount: number;
    parseBlocks: ((source: string) => unknown[]) | undefined;
    /** Literal block scalars lifted out of the frontmatter, by sentinel. */
    blockScalars: Map<string, string>;
}

function warn(ctx: Ctx, msg: string, details?: Record<string, unknown>, sourceLocation?: unknown): void {
    ctx.warnings.push(msg);
    ctx.diagnostics.push(diagnostic('carve-to-pandoc', msg, details, sourceLocation));
}

/**
 * A warning carries enough of the dropped content to find it in the source,
 * and not a whole fenced block.
 */
function truncateForWarning(content: string): string {
    const flat = content.replace(/\s+/g, ' ').trim();
    return flat.length > 80 ? `${flat.slice(0, 77)}...` : flat;
}

function toAttr(attrs: unknown): P.Attr {
    const a = (attrs ?? {}) as CAttrs;
    const kvs = Object.entries(a.keyValues ?? {});
    return P.attr(a.id, a.classes, kvs);
}

/**
 * POLICY: Carve has no small-caps node, and `.smallcaps` is the span that
 * stands in for one - in both directions. `reverse.ts` writes that class for a
 * pandoc `SmallCaps`; this reads it back, so the construct survives
 * Pandoc -> Carve -> Pandoc instead of arriving at the LaTeX/Typst/DOCX writers
 * as a bare `Span` they render without any small-caps at all.
 *
 * The rule is pandoc's own, not an invention here: its markdown reader turns
 * `[x]{.smallcaps}` into `SmallCaps`, strips the class, and keeps whatever
 * other attributes the span had by wrapping the result in a `Span`. Matched
 * exactly, case included (`.SmallCaps` is an ordinary class to pandoc too), so
 * a document that goes through pandoc-flavored markdown and one that goes
 * through this bridge produce the same tree.
 */
function smallCapsOrSpan(a: P.Attr, xs: P.Inline[]): P.Inline {
    const [id, classes, kvs] = a;
    if (!classes.includes('smallcaps')) return P.Span(a, xs);
    const rest = classes.filter((c) => c !== 'smallcaps');
    const caps = P.SmallCaps(xs);
    if (!id && rest.length === 0 && kvs.length === 0) return caps;
    return P.Span([id, rest, kvs], [caps]);
}

/** Carve's heading slug: case-preserving, GitHub-style. */
function slugify(text: string): string {
    return text
        .trim()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s+/g, '-');
}

function plainText(nodes: CNode[]): string {
    let out = '';
    for (const n of nodes) {
        if (typeof n.value === 'string') out += n.value;
        // An inline literal renders as visible prose (PART 9 SS27), so its
        // verbatim content IS text and must reach heading slugs - carve-js
        // folds it into its own heading ids for the same reason. Other
        // `content`-carrying nodes stay excluded on purpose: a comment renders
        // nothing at all, and math/raw are not plain prose.
        else if (n.type === 'literal_inline' && typeof n.content === 'string') out += n.content;
        else if (Array.isArray(n.children)) out += plainText(n.children as CNode[]);
    }
    return out;
}

/** True when an attribute block carries anything worth preserving. */
function hasAttrs(a: CAttrs | undefined): boolean {
    return Boolean(a && (a.id || a.classes?.length || Object.keys(a.keyValues ?? {}).length));
}

function hasLabel(n: CNode): n is CNode & { label: string } {
    return typeof n.label === 'string' && n.label.length > 0;
}

/**
 * A fenced div's grouping `[label]` rendered as a caption Para, or [] when the
 * node has none. Normative graceful-degradation rule: a `[label]` that no group
 * extension consumes (tabs/code-group are extensions; this bridge runs none)
 * MUST survive as a visible caption, else a reader of the LaTeX/Typst/DOCX
 * output cannot tell the panels apart. The reference HTML renderer emits
 * `<p class="div-label">`; here it is a bold line - the same slot the quoted
 * title uses, and title comes first when a block carries both.
 *
 * In roundtrip mode the label is preserved structurally instead (see
 * `labelKv`), so the reverse importer can rebuild the `[label]` grouping token
 * exactly; a flattened caption Para would be indistinguishable from a title.
 */
function labelCaption(ctx: Ctx, n: CNode): P.Block[] {
    return !ctx.roundtrip && hasLabel(n) ? [P.Para([P.Strong(textInlines(n.label))])] : [];
}

/**
 * Roundtrip-only kv that carries the grouping `[label]` for exact re-import.
 * The `.` in the key is deliberate: Carve's attribute grammar rejects dotted
 * keys, so a document can never carry a user-authored `carve.label` attribute
 * that the reverse importer would mistake for this internal marker.
 */
function labelKv(ctx: Ctx, n: CNode): [string, string][] {
    return ctx.roundtrip && hasLabel(n) ? [['carve.label', n.label]] : [];
}

/** Split text into Str/Space the way pandoc readers do. */
// Glyphs for the smart-typography kinds that do not carry one on the node.
// A quote's glyph is locale-dependent and is chosen during parsing, so the node
// records it; the rest are fixed and resolvable from the kind.
//
// Duplicated from carve-js, which exports SMART_PUNCTUATION_GLYPHS from ast.ts
// but not from the package root - see carve#355. Drop this table once the
// export lands.
const SMART_PUNCTUATION_GLYPHS: Record<string, string> = {
    ellipsis: '\u2026',
    em_dash: '\u2014',
    en_dash: '\u2013',
    left_right_arrow: '\u2194',
    rightwards_arrow: '\u2192',
    leftwards_arrow: '\u2190',
    rightwards_double_arrow: '\u21D2',
    less_than_or_equal: '\u2264',
    greater_than_or_equal: '\u2265',
    not_equal: '\u2260',
    plus_minus: '\u00B1',
    copyright: '\u00A9',
    registered: '\u00AE',
    trademark: '\u2122',
};

function smartPunctuationText(n: CNode): string {
    const glyph = n.glyph as string | undefined;
    if (glyph) return glyph;
    const kind = String(n.kind ?? '');
    return SMART_PUNCTUATION_GLYPHS[kind] ?? String(n.value ?? '');
}

/**
 * The engines' SENTINEL for a no-break space the parser resolved - from an
 * escaped space, or from a line block's preserved indentation - is U+E000, a
 * PRIVATE-USE codepoint (markup-carve/carve#721). It is spec surface a consumer has to
 * map: passing it through put a private-use character into Pandoc JSON, so
 * every writer downstream - docx, LaTeX, HTML - rendered a tofu box where a
 * no-break space belonged, and nothing warned.
 *
 * U+00A0 is the right target: Pandoc has no separate representation for a
 * resolved space, and a literal no-break space is what the source means. A
 * U+00A0 the author typed is published by the engines as itself and needs no
 * mapping.
 */
const RESOLVED_NBSP = /\uE000/g;

function resolvedSpaces(value: string): string {
    return value.replace(RESOLVED_NBSP, '\u00A0');
}

function textInlines(raw: string): P.Inline[] {
    const value = resolvedSpaces(raw);
    const out: P.Inline[] = [];
    const parts = value.split(/( +)/);
    for (const part of parts) {
        if (part === '') continue;
        if (/^ +$/.test(part)) out.push(P.Space);
        else out.push(P.Str(part));
    }
    return out;
}

// Like textInlines, but preserves the exact number of spaces by emitting one
// Space per space character instead of one per run. Prose collapsing is correct
// for ordinary text, but an inline literal captures its content VERBATIM, so
// `` !`a  b` `` must not reach a writer as "a b".
function verbatimInlines(raw: string): P.Inline[] {
    const value = resolvedSpaces(raw);
    const out: P.Inline[] = [];
    for (const part of value.split(/( )/)) {
        if (part === '') continue;
        if (part === ' ') out.push(P.Space);
        else out.push(P.Str(part));
    }
    return out;
}

/**
 * The label a caption numbers under - the word before its `#`.
 *
 * The engine keeps one sequence PER LABEL, not per element kind: `Figure #`,
 * `Listing #`, `Figure #` on three figures numbers them Figure 1, Listing 1,
 * Figure 2. Keying on figure-versus-table would have made that Listing 2.
 */
function captionLabel(nodes: CNode[] | undefined): string | undefined {
    if (!Array.isArray(nodes)) return undefined;
    const at = nodes.findIndex((x) => x?.type === 'caption_number');
    if (at <= 0) return undefined;
    // ALL the text before the placeholder, markup included.
    //
    // docs-extensions.md: "the label is the text before it". Three narrower
    // readings were wrong, each caught in review:
    //   - the element kind      `Listing #` after `Figure #` numbered 2, not 1
    //   - the last word         `Supplementary Figure` merged into `Figure`
    //   - only `text` nodes     `*Figure*` fell to a generic counter, where
    //                           the engine shares the `Figure` sequence and
    //                           numbers it 2
    // So the label is the flattened inline TEXT, which is what the resolver
    // compares.
    const label = nodes.slice(0, at).map(inlineText).join('').trim();
    return label || undefined;
}

/**
 * The text content of an inline node, markup flattened away.
 *
 * Carve's inline nodes do not agree on where their text lives: most use
 * `value`, a literal inline uses `content`, a symbol carries its resolved
 * glyph. Reading only `value` sent `!`Figure`` to a generic counter, where the
 * engine shares the `Figure` sequence - the fourth narrowing this function
 * needed, all four found in review.
 */
function inlineText(n: CNode | undefined): string {
    if (!n || typeof n !== 'object') return '';
    for (const key of ['value', 'content', 'glyph', 'text'] as const) {
        const v = (n as Record<string, unknown>)[key];
        if (typeof v === 'string') return v;
    }
    const kids = (n.children as CNode[] | undefined) ?? [];
    return kids.map(inlineText).join('');
}

// --- Inlines ---

function inlines(ctx: Ctx, nodes: CNode[] | undefined): P.Inline[] {
    if (!nodes) return [];
    const out: P.Inline[] = [];
    for (const n of pairQuotes(nodes)) out.push(...inline(ctx, n));
    return joinAdjacentStr(out);
}

/**
 * The synthetic node a matched pair of quote marks becomes, between
 * {@link pairQuotes} and the `Quoted` it converts to. Not a Carve type and
 * never serialized - the name is deliberately unspellable so it cannot collide
 * with a node type an engine might add.
 */
const QUOTED = '__pandocQuoted';

const QUOTE_OPENS: Record<string, P.QuoteType> = {
    left_double_quote: 'DoubleQuote',
    left_single_quote: 'SingleQuote',
};
const QUOTE_CLOSES: Record<string, P.QuoteType> = {
    right_double_quote: 'DoubleQuote',
    right_single_quote: 'SingleQuote',
};

const quoteRole = (n: CNode): [P.QuoteType, 'open' | 'close'] | null => {
    if (n?.type !== 'smart_punctuation') return null;
    const kind = String(n.kind ?? '');
    const open = QUOTE_OPENS[kind];
    if (open) return [open, 'open'];
    const close = QUOTE_CLOSES[kind];
    return close ? [close, 'close'] : null;
};

/**
 * Rebuild pandoc's WRAPPING quotation from Carve's two standalone marks.
 *
 * Carve's parser resolves `"` and `'` to `smart_punctuation` nodes carrying
 * the kind (`left_double_quote`, `right_single_quote`, ...), which is strictly
 * more information than the glyph - and exactly the information pandoc's
 * `Quoted` needs. Without this a quotation crossed the bridge as three
 * separate pieces and came back as `Str "“alpha”"`, so a document quoting
 * anything could not survive pandoc -> Carve -> pandoc.
 *
 * WHAT IS DELIBERATELY NOT PAIRED. Only marks that are SIBLINGS pair, and only
 * a close against a still-open mark of the same kind:
 *
 *  - An APOSTROPHE (`it's`) resolves to a lone `right_single_quote` with no
 *    opener. It stays a mark, which is the whole reason the match runs from
 *    the closing side against a stack rather than pairing greedily.
 *  - An UNCLOSED `"` stays a mark too - a `Quoted` running to the end of the
 *    paragraph would assert a quotation the author never closed.
 *  - A quotation crossing an emphasis boundary (`"a /b" c/`) puts its two
 *    marks in different sibling arrays, where neither can see the other, and
 *    both stay marks.
 *
 * In all three the glyph still renders; the node just is not promoted.
 */
function pairQuotes(nodes: CNode[]): CNode[] {
    const closerOf = new Map<number, number>();
    const kindOf = new Map<number, P.QuoteType>();
    const open: { at: number; kind: P.QuoteType }[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const role = quoteRole(nodes[i]!);
        if (!role) continue;
        const [kind, side] = role;
        if (side === 'open') {
            open.push({ at: i, kind });
            continue;
        }
        // The NEAREST unclosed opener of the same kind, so nesting works and a
        // stray closer of the other kind cannot consume it.
        for (let j = open.length - 1; j >= 0; j--) {
            if (open[j]!.kind !== kind) continue;
            closerOf.set(open[j]!.at, i);
            kindOf.set(open[j]!.at, kind);
            open.length = j;
            break;
        }
    }
    if (closerOf.size === 0) return nodes;

    // The pairs nest by construction, so one recursive walk builds the tree.
    const build = (from: number, to: number): CNode[] => {
        const out: CNode[] = [];
        for (let i = from; i < to;) {
            const close = closerOf.get(i);
            if (close !== undefined && close < to) {
                out.push({ type: QUOTED, quote: kindOf.get(i), children: build(i + 1, close) });
                i = close + 1;
                continue;
            }
            out.push(nodes[i]!);
            i++;
        }
        return out;
    };
    return build(0, nodes.length);
}

/**
 * Merge neighbouring `Str` nodes into one.
 *
 * Pandoc's own readers emit one `Str` per WORD, with `Space` between; two
 * `Str` nodes touching is legal but not a shape pandoc produces, and a
 * consumer doing word-level work sees three words where there is one.
 *
 * Carve's tree splits a word wherever a construct sits inside it, and that got
 * more common when carve-js stopped substituting smart-punctuation characters
 * and started publishing them as nodes: `Carve's` is now `text`,
 * `smart_punctuation`, `text`, so a direct mapping yields Str("Carve"),
 * Str("’"), Str("s"). The rendered text is identical - writers concatenate -
 * but the AST is not the one pandoc would have built, and it is the AST this
 * package exists to hand over.
 */
function joinAdjacentStr(xs: P.Inline[]): P.Inline[] {
    const out: P.Inline[] = [];
    for (const x of xs) {
        const prev = out[out.length - 1];
        if (x.t === 'Str' && prev?.t === 'Str') {
            out[out.length - 1] = P.Str(String(prev.c) + String(x.c));
            continue;
        }
        out.push(x);
    }
    return out;
}

function kids(ctx: Ctx, n: CNode): P.Inline[] {
    return inlines(ctx, n.children as CNode[] | undefined);
}

/**
 * A reference link or image whose label nothing defines.
 *
 * PART 12 section 3a publishes the resolution BESIDE the authored construct
 * rather than in place of it: `[a][t]` is a `link` carrying `ref`/`rawRef`
 * whether or not the document defines `t`, and `href` (`src` for an image) is
 * empty ONLY where nothing resolved it. So the pair "a reference was written"
 * and "the destination is empty" is the wire's statement that the reference
 * did not resolve, and it is the only one - there is no way to author an empty
 * destination on a definition line (`[t]: <>` defines the literal `<>`).
 *
 * Carve renders such a reference as the LITERAL SOURCE, so this returns
 * `rawRef` as text. Emitting a `Link` with an empty target instead would
 * invent a node the document does not contain, and downstream it renders as a
 * broken anchor rather than as the text the reader is meant to see.
 *
 * And it warns, because the sibling path does. An unresolved footnote has said
 * `footnote: missing definition for [^f]` all along; a missing link definition
 * has no reason to be the quieter of the two, and a conversion that loses the
 * author's meaning with a clean exit code is the failure this pairs with
 * (markup-carve/pandoc-carve#91).
 *
 * Returns null when the node is not an unresolved reference, so the caller
 * converts it normally.
 */
/**
 * The heading a COLLAPSED reference reaches, or null.
 *
 * `[Some Heading][]` with no definition anywhere links to the heading whose
 * RENDERED text matches, case-insensitively - so `[plain one][]` reaches
 * `# Plain One`. The engine resolves this after the parse, which is why the
 * node still carries an empty `href` here.
 *
 * Only the collapsed form. `[text][Some Heading]` does not reach a heading,
 * measured on the engine: it renders as its literal source. Detected on
 * `rawRef` ending in `][]`, which is what makes the form collapsed.
 */
function collapsedHeadingRef(ctx: Ctx, n: CNode): string | undefined {
    if (!String(n.rawRef ?? '').endsWith('][]')) return undefined;
    const text = plainText((n.children as CNode[] | undefined) ?? []).trim().toLowerCase();
    return text ? ctx.headingIdByText.get(text) : undefined;
}

function unresolvedReference(ctx: Ctx, n: CNode, kind: 'link' | 'image'): P.Inline[] | null {
    if (n.ref === undefined) return null;
    const destination = String((kind === 'link' ? n.href : n.src) ?? '');
    if (destination !== '') return null;
    const ref = String(n.ref ?? '');
    warn(ctx, `${kind}: missing definition for [${ref}] - emitting the literal source`);
    const raw = String(n.rawRef ?? '');
    // rawRef is required beside ref, so the fallback is for a tree assembled by
    // hand: keep the visible text rather than dropping the construct entirely.
    if (raw === '') return kind === 'link' ? kids(ctx, n) : textInlines(String(n.alt ?? ''));
    // A reference may be written across lines. Its literal source is prose now,
    // so the line break is a SoftBreak - a newline left inside a Str would
    // reach every writer verbatim.
    const out: P.Inline[] = [];
    raw.split(/\r?\n/).forEach((line, at) => {
        if (at > 0) out.push(P.SoftBreak);
        out.push(...textInlines(line));
    });
    return out;
}

function inline(ctx: Ctx, n: CNode): P.Inline[] {
    switch (n.type) {
        case 'text':
            return textInlines(String(n.value ?? ''));
        case 'soft_break':
            return [P.SoftBreak];
        case 'hard_break':
            return [P.LineBreak];
        case 'emphasis':
            return [P.Emph(kids(ctx, n))];
        case 'strong':
            return [P.Strong(kids(ctx, n))];
        case 'underline':
            return [P.Underline(kids(ctx, n))];
        case 'strike':
            return [P.Strikeout(kids(ctx, n))];
        case 'highlight':
            return [P.Span(P.attr(undefined, ['mark']), kids(ctx, n))];
        case 'subscript':
            return [P.Subscript(kids(ctx, n))];
        case 'superscript':
            return [P.Superscript(kids(ctx, n))];
        case 'code':
            return [P.Code(toAttr(n.attrs), String(n.value ?? ''))];
        case 'literal_inline': {
            // PART 9 SS27: verbatim capture rendered as ORDINARY PROSE. The
            // `<code>` wrapper is deliberately dropped, so Pandoc `Code` would
            // invert the construct's entire purpose (it implies monospace/code
            // styling - the exact thing the literal exists to avoid). Emit
            // plain text, and wrap in a Span only when attributes need
            // somewhere to live - mirroring carve-js, which emits a `<span>`
            // only when the attribute block is present and bare text otherwise.
            // verbatimInlines, not textInlines: the content is captured verbatim,
            // so runs of spaces must survive rather than collapse to one Space.
            const text = verbatimInlines(String(n.content ?? ''));
            return hasAttrs(n.attrs as CAttrs | undefined)
                ? [P.Span(toAttr(n.attrs), text)]
                : text;
        }
        case 'link': {
            // A collapsed reference to a heading is RESOLVED, not missing, so
            // it is tried before the missing-definition path reports one.
            const heading = String(n.href ?? '') === '' ? collapsedHeadingRef(ctx, n) : undefined;
            if (heading !== undefined) {
                return [P.Link(toAttr(n.attrs), kids(ctx, n), ['#' + heading, ''])];
            }
            const unresolved = unresolvedReference(ctx, n, 'link');
            if (unresolved) return unresolved;
            return [
                P.Link(toAttr(n.attrs), kids(ctx, n), [
                    String(n.href ?? ''),
                    String(n.title ?? ''),
                ]),
            ];
        }
        case 'autolink': {
            const href = String(n.href ?? '');
            const cls = href.startsWith('mailto:') ? 'email' : 'uri';
            // An autolink takes a trailing attribute like any other inline
            // (`<https://example.com>{.ext}`), and pandoc's Link has the slot
            // for it, but only the synthesized `uri`/`email` class was written -
            // so the author's id, classes and key-values left the document with
            // nothing reported. They join the synthesized class rather than
            // replace it: the class says what KIND of link this is, and a
            // consumer keying on it should not lose that because the author
            // added one of their own.
            const [id, classes, kvs] = toAttr(n.attrs);
            return [
                P.Link([id, [cls, ...classes], kvs], [P.Str(String(n.text ?? href))], [href, '']),
            ];
        }
        case 'image': {
            const unresolved = unresolvedReference(ctx, n, 'image');
            if (unresolved) return unresolved;
            return [
                P.Image(toAttr(n.attrs), textInlines(String(n.alt ?? '')), [
                    String(n.src ?? ''),
                    String(n.title ?? ''),
                ]),
            ];
        }
        case 'caption_number': {
            // The `#` in `^ Figure #: text`. It has no value in the tree - the
            // renderer assigns one - so it was degrading to empty and the
            // caption reached pandoc as `Figure : text`, silently unnumbered
            // in every writer.
            //
            // Inside a panel it draws nothing and prints as the author wrote
            // it (PART 9 §4c, corpus 318-composite-figures-8's sibling lint
            // `figure-group-panel-number`).
            if (ctx.inPanel) return [P.Str('#')];
            const kind = ctx.captionKind ?? 'caption';
            const next = (ctx.captionCounts.get(kind) ?? 0) + 1;
            ctx.captionCounts.set(kind, next);
            return [P.Str(String(next))];
        }
        case 'heading_ref': {
            // Nested inside a crossref's own resolution: the engine emits
            // nothing for it, so `# A </#a>` yields the link text `A ` rather
            // than recurring. Matches corpus 118.
            if (ctx.inCrossref) return [];
            const target = String(n.target ?? '');
            const found =
                ctx.crossrefTargets.get(target) ??
                ctx.crossrefTargets.get(target.toLowerCase()) ??
                findCaseInsensitive(ctx.crossrefTargets, target);
            if (found) {
                // A caption target cannot come back as a crossref (see
                // `captionTargets`), so it goes out as a plain link.
                const classes = ctx.captionTargets.has(target.toLowerCase())
                    ? []
                    : ['crossref'];
                ctx.inCrossref = true;
                try {
                    return [
                        P.Link(P.attr(undefined, classes), inlines(ctx, found), [
                            `#${target}`,
                            '',
                        ]),
                    ];
                } finally {
                    ctx.inCrossref = false;
                }
            }
            warn(ctx, `crossref: unresolved target "${target}" - emitting target text`);
            return [P.Link(P.attr(undefined, ['crossref', 'unresolved']), [P.Str(target)], [`#${target}`, ''])];
        }
        // The wire has two nodes here, split so that a profile can deny one
        // without the other (markup-carve/carve#405): `footnote_ref` (`[^a]`)
        // and `inline_footnote` (`^[…]`). The pre-split spelling a pinned
        // engine still emits is folded onto these two in `src/ast-json.ts`, so
        // this switch never has to know it existed.
        case 'footnote_ref':
        case 'inline_footnote': {
            // The note's own content is converted BEFORE the counter moves, so
            // a citation inside the note carries that note's number rather than
            // the next one - which is what pandoc's markdown reader produces.
            if (Array.isArray(n.inline)) {
                const note = P.Note([P.Para(inlines(ctx, n.inline as CNode[]))]);
                ctx.noteCount++;
                return [note];
            }
            const id = String(n.id ?? '');
            const def = ctx.footnoteDefs[id];
            if (!def) {
                // THE LITERAL SOURCE, not a superscript.
                //
                // Carve renders an unresolved `[^f]` as the four characters the
                // author typed. This used to emit `Superscript [Str "f"]`, which
                // is a construct the document does not contain: the reader saw a
                // raised `f` where the source says `[^f]`, and the round trip
                // came back spelling it `{^f^}` - a superscript in Carve too, so
                // the loss was permanent rather than merely cosmetic.
                //
                // The sibling path has been right all along. An unresolved link
                // or image reference returns its `rawRef` as text for exactly
                // this reason (see `unresolvedReference`), and there was no
                // reason for a footnote to be the one construct that invented a
                // node instead.
                //
                // A footnote reference carries no `rawRef`, so the source is
                // rebuilt from the id. That is faithful even where the author
                // wrote a trailing attribute: the engine drops the attribute
                // along with the reference, so `[^a]{.ref}` renders `[^a]` too.
                warn(ctx, `footnote: missing definition for [^${id}] - emitting the literal source`);
                return textInlines(`[^${id}]`);
            }
            const note = P.Note(blocks(ctx, def));
            ctx.noteCount++;
            return [note];
        }
        case 'math':
            return [
                n.display
                    ? P.MathDisplay(String(n.content ?? ''))
                    : P.MathInline(String(n.content ?? '')),
            ];
        case 'raw_inline':
            return [P.RawInline(String(n.format ?? ''), String(n.content ?? ''))];
        case 'mention': {
            const user = String(n.user ?? '');
            return [P.Span(P.attr(undefined, ['mention'], [['data-user', user]]), [P.Str(`@${user}`)])];
        }
        case 'tag': {
            const name = String(n.name ?? '');
            return [P.Span(P.attr(undefined, ['tag'], [['data-tag', name]]), [P.Str(`#${name}`)])];
        }
        case 'symbol': {
            const name = String(n.name ?? '');
            const mapped = ctx.symbols[name];
            if (mapped !== undefined) return textInlines(mapped);
            warn(ctx, `symbol: :${name}: has no entry in the symbols map - emitting literal source form`);
            return [P.Span(P.attr(undefined, ['symbol'], [['data-symbol', name]]), [P.Str(`:${name}:`)])];
        }
        case 'abbreviation': {
            const abbr = String(n.abbr ?? '');
            const expansion = String(n.expansion ?? '');
            return [P.Span(P.attr(undefined, ['abbr'], [['title', expansion]]), [P.Str(abbr)])];
        }
        case 'inline_extension': {
            const name = String(n.name ?? '');
            const content = Array.isArray(n.content)
                ? inlines(ctx, n.content as CNode[])
                : textInlines(String(n.content ?? ''));
            warn(ctx, `extension: :${name}[..] degraded to a Span with class "ext-${name}"`);
            return [P.Span(P.attr(undefined, [`ext-${name}`]), content)];
        }
        case 'citation_group':
            return [citationGroup(ctx, n)];
        case 'span':
            return [smallCapsOrSpan(toAttr(n.attrs), kids(ctx, n))];
        case 'insert':
            return [P.Span(P.attr(undefined, ['insertion']), kids(ctx, n))];
        case 'delete':
            return [P.Span(P.attr(undefined, ['deletion']), kids(ctx, n))];
        case 'substitution': {
            const oldText = textInlines(String(n.oldText ?? ''));
            const newText = textInlines(String(n.newText ?? ''));
            return [
                P.Span(P.attr(undefined, ['substitution']), [
                    P.Span(P.attr(undefined, ['deletion']), oldText),
                    P.Str('→'),
                    P.Span(P.attr(undefined, ['insertion']), newText),
                ]),
            ];
        }
        // `critic_comment` is the schema's spelling and the only one the wire
        // carries; the hyphenated name a pinned engine still emits internally
        // is folded onto it in `src/ast-json.ts`.
        case 'critic_comment':
            return [P.Span(P.attr(undefined, ['comment-annotation']), textInlines(String(n.text ?? '')))];
        case 'comment':
            // Pandoc's AST has no comment node, so dropping is the conversion -
            // but a silent drop is not (markup-carve/pandoc-carve#75). The
            // warning names the content, so a migration can see what did not
            // make the trip.
            if (ctx.roundtrip) return [P.Span(provenanceAttr('comment', n), [])];
            warn(ctx, `comment: dropped - Pandoc's AST has no comment node: ${truncateForWarning(String(n.content ?? ''))}`, { construct: 'comment' }, n.pos);
            return [];
        case QUOTED:
            return [
                P.Quoted(
                    (n.quote as P.QuoteType | undefined) ?? 'DoubleQuote',
                    inlines(ctx, n.children as CNode[]),
                ),
            ];
        case 'smart_punctuation':
            // The resolved glyph, not the author's source run. Pandoc applies
            // its own smart punctuation when READING markdown, not when
            // consuming a JSON AST, so handing it `--` yields a literal double
            // hyphen downstream. Carve already made the decision; keeping it is
            // what carries the typography into LaTeX, DOCX and the rest.
            return [P.Str(smartPunctuationText(n))];
        case 'escaped_text':
            // The character the author escaped. The backslash is authoring
            // syntax and does not survive into pandoc's AST; the character does,
            // and stays literal because pandoc will not re-smarten AST input -
            // which is exactly what the escape asked for.
            return [P.Str(String(n.value ?? ''))];
        default:
            if (ctx.roundtrip) return [P.Span(provenanceAttr('unknown-inline', n), textInlines(plainText([n])))];
            warn(ctx, `inline: unknown node type "${n.type}" degraded to its text content`, { nodeType: n.type }, n.pos);
            return textInlines(plainText([n]));
    }
}

/** One `@key` of a citation group, as `resources/ast-schema.json` pins it. */
interface CCitation {
    key?: string;
    prefix?: CNode[];
    locator?: CNode[];
    locatorLabel?: string;
    locatorValue?: string;
    suffix?: CNode[];
    suppressAuthor?: boolean;
}

/**
 * PART 9 §22 citation group -> pandoc `Cite`.
 *
 * Three things do not line up, and each is handled the way citeproc itself
 * does it rather than by inventing a convention:
 *
 *  - **Mode.** Carve's integral `+` is a property of the whole cluster;
 *    pandoc's mode is per item. Integral maps to `AuthorInText` on each item.
 *    An item's own `-` (suppress author) is narrower than the group's mode and
 *    wins, because dropping it would print an author the source asked to hide.
 *  - **Locator.** `Citation` has no locator slot at all - pandoc's markdown
 *    reader puts `, p. 33` in `citationSuffix` and citeproc parses it back out
 *    there. So the locator TEXT crosses intact and citeproc re-derives the same
 *    `{label, value}` pair Carve had parsed; only the typing is lost, which is
 *    what the warning says.
 *  - **Content.** The Cite's second field is the verbatim source, which is
 *    exactly what `citation_group.raw` holds. Every non-citeproc writer prints
 *    that, so a document converted without `--citeproc` still reads correctly.
 */
function citationGroup(ctx: Ctx, n: CNode): P.Inline {
    const integral = n.mode === 'integral';
    const items = (n.items as CCitation[] | undefined) ?? [];
    const citations = items.map((item) => {
        const key = String(item.key ?? '');
        let mode: P.CitationMode = integral ? 'AuthorInText' : 'NormalCitation';
        if (item.suppressAuthor) {
            if (integral) {
                warn(ctx, `citation: @${key} suppresses its author inside an integral group - pandoc's mode is per item, so the item keeps SuppressAuthor`);
            }
            mode = 'SuppressAuthor';
        }
        if (item.locatorLabel && !ctx.roundtrip) {
            warn(ctx, `citation: @${key}'s typed locator (${item.locatorLabel}) is serialized into the pandoc citation suffix - pandoc's Citation has no locator field`);
        }
        return P.citation(
            key,
            mode,
            item.prefix?.length ? inlines(ctx, item.prefix) : [],
            citationSuffix(ctx, item),
            ctx.noteCount + 1,
        );
    });
    const cite = P.Cite(citations, textInlines(String(n.raw ?? '')));
    return ctx.roundtrip ? P.Span(provenanceAttr('citation', n), [cite]) : cite;
}

/**
 * The suffix citeproc reads: the locator text after its `, ` separator, which
 * is the whole post-comma run - Carve's `suffix` is the tail of `locator`, not
 * a sibling of it, so emitting both would print the tail twice.
 */
function citationSuffix(ctx: Ctx, item: CCitation): P.Inline[] {
    if (item.locator?.length) return [P.Str(','), P.Space, ...inlines(ctx, item.locator)];
    if (item.suffix?.length) return [P.Space, ...inlines(ctx, item.suffix)];
    return [];
}

/**
 * A `[@key]: entry` bibliography line (PART 12 section 18) as citeproc's own
 * bibliography entry: `Div ("ref-<key>", ["csl-entry"], ...)`.
 *
 * There was no arm for this node at all, so a definition fell to the generic
 * "unknown node type" path and left as a paragraph of its text - the entry
 * printed in the body of the document, where Carve renders nothing, and the
 * key that binds it to its citations was dropped on the floor.
 *
 * `csl-entry` under `ref-<key>` is not a shape invented here. It is what
 * `pandoc --citeproc` writes for a resolved bibliography entry and what
 * pandoc's markdown reader reads back, so the mapping lands in the vocabulary
 * the rest of the pandoc ecosystem already keys on: a filter or template that
 * styles a bibliography finds one.
 *
 * The `{author= year=}` metadata rides along as the Div's key-values. Pandoc
 * has no slot for it - citeproc takes those from the CSL data, not from the
 * document - but dropping a field the node carries is the thing this bridge
 * does not do, and an attribute pandoc preserves costs nothing to keep.
 */
function citationDefinition(ctx: Ctx, n: CNode): P.Block {
    const key = String(n.key ?? '');
    const [id, classes, kvs] = toAttr(n.attrs);
    const entry = inlines(ctx, n.children as CNode[] | undefined);
    return P.Div(
        [id || (key ? `ref-${key}` : ''), ['csl-entry', ...classes], kvs],
        // Section 18 allows an empty entry, and an empty `Para` is not a shape
        // pandoc's own readers produce.
        entry.length ? [P.Para(entry)] : [],
    );
}

function findCaseInsensitive(map: Map<string, CNode[]>, target: string): CNode[] | undefined {
    const lower = target.toLowerCase();
    for (const [k, v] of map) {
        if (k.toLowerCase() === lower) return v;
    }
    return undefined;
}

// --- Blocks ---

function blocks(ctx: Ctx, nodes: CNode[] | undefined): P.Block[] {
    if (!nodes) return [];
    const out: P.Block[] = [];
    for (const n of nodes) out.push(...block(ctx, n));
    return out;
}

/** Block types whose Pandoc form carries the Attr itself. */
const ATTR_CARRYING = new Set([
    'heading',
    'code_block',
    'table',
    'figure',
    'figure_group',
    'div',
    'admonition',
    // Its Div IS the entry, and its attrs are the `{author= year=}` block that
    // belongs on it. Left out, the wrapper below adds a SECOND Div carrying the
    // same key-values around the one that already has them.
    'citation_definition',
]);

function block(ctx: Ctx, n: CNode): P.Block[] {
    const result = blockInner(ctx, n);
    // A block-attribute line can attach attrs to ANY block. Pandoc's Para,
    // BlockQuote, lists etc. have no Attr slot - preserve via a Div wrapper.
    const a = n.attrs as CAttrs | undefined;
    // NOTHING IS NOT WRAPPED. A node that renders nothing where it sits - a
    // link reference definition, an abbreviation definition - converts to no
    // blocks, and wrapping that in a Div to carry its attrs put a visible empty
    // element into every writer's output where Carve renders none:
    // `[a]: /u {.c}` came back as `<div class="c"></div>`. The attrs are not
    // lost by skipping it; they are already on whatever the definition feeds,
    // which is where they render.
    if (!result.length) return result;
    if (!ATTR_CARRYING.has(n.type) && hasAttrs(a)) {
        // In roundtrip mode the carve-block marker lets the reverse direction
        // restore the attrs onto the inner block instead of keeping a wrapper.
        const [id, classes, kvs] = toAttr(a);
        const marked: [string, string][] = ctx.roundtrip
            ? [...kvs, ['carve-block', n.type]]
            : kvs;
        return [P.Div([id, classes, marked], result)];
    }
    return result;
}

/**
 * True for the div form of a line block: the `line-block` class and nothing else
 * to preserve. A div that ALSO carries an id, other classes or key/values is a
 * div the author attributed, and Pandoc's LineBlock has no attribute slot to put
 * them in - so those stay a Div rather than lose the attributes.
 */
function isLineBlockDiv(n: CNode, classes: string[]): boolean {
    if (!classes.includes('line-block')) return false;
    const [id, , kvs] = toAttr(n.attrs);
    return classes.length === 1 && id === '' && kvs.length === 0;
}

/**
 * A line block's stanzas are its child paragraphs; within a stanza the lines are
 * separated by hard breaks. Pandoc's LineBlock is a flat list of lines, and a
 * blank line between stanzas is an EMPTY line - the same shape pandoc's own
 * markdown reader produces for a `|` line with nothing after it.
 */
function lineBlock(ctx: Ctx, n: CNode): P.Block {
    const lines: P.Inline[][] = [];
    const stanzas = (n.children as CNode[] | undefined) ?? [];
    stanzas.forEach((stanza, i) => {
        if (i > 0) lines.push([]);
        const kids = (stanza.children as CNode[] | undefined) ?? [stanza];
        let current: CNode[] = [];
        for (const kid of kids) {
            if (kid.type === 'hard_break' || kid.type === 'soft_break') {
                lines.push(inlines(ctx, current));
                current = [];
                continue;
            }
            current.push(kid);
        }
        lines.push(inlines(ctx, current));
    });
    return P.LineBlock(lines);
}

function blockInner(ctx: Ctx, n: CNode): P.Block[] {
    switch (n.type) {
        case 'paragraph': {
            const xs = kids(ctx, n);
            return [ctx.tight ? P.Plain(xs) : P.Para(xs)];
        }
        case 'heading':
            return [P.Header(Number(n.level ?? 1), toAttr(n.attrs), kids(ctx, n))];
        case 'block_quote':
            return [P.BlockQuote(untight(ctx, () => blocks(ctx, n.children as CNode[])))];
        case 'code_block': {
            const lang = n.lang ? [String(n.lang)] : [];
            const a = (n.attrs ?? {}) as CAttrs;
            const kvs = Object.entries(a.keyValues ?? {});
            return [
                P.CodeBlock(P.attr(a.id, [...lang, ...(a.classes ?? [])], kvs), String(n.content ?? '')),
            ];
        }
        case 'raw_block':
            return [P.RawBlock(String(n.format ?? ''), String(n.content ?? ''))];
        case 'citation_definition':
            return [citationDefinition(ctx, n)];
        case 'thematic_break':
            return [P.HorizontalRule];
        case 'list':
            return [list(ctx, n)];
        case 'definition_list':
            return [definitionList(ctx, n)];
        case 'table':
            return [table(ctx, n, null)];
        case 'figure':
            return figure(ctx, n);
        case 'figure_group':
            return figureGroup(ctx, n);
        case 'admonition': {
            const kind = String(n.kind ?? 'note');
            if (kind === 'list-table' && ctx.listTable) {
                const converted = listTableToTable(ctx, n);
                if (converted) return [converted];
                warn(ctx, 'list-table: structure not table-shaped - kept as the degraded Div (content preserved)');
            }
            const title = Array.isArray(n.title)
                ? [P.Para([P.Strong(inlines(ctx, n.title as CNode[]))])]
                : [];
            const body = untight(ctx, () => blocks(ctx, n.children as CNode[]));
            const [id, classes, kvs] = toAttr(n.attrs);
            return [
                P.Div(
                    [id, ['admonition', kind, ...classes], [...kvs, ...labelKv(ctx, n)]],
                    [...title, ...labelCaption(ctx, n), ...body],
                ),
            ];
        }
        // A LINE BLOCK (`::: |`, PART 9 SS23) is verse: each newline is a line of
        // its own and the leading whitespace is preserved. Pandoc has `LineBlock`
        // for exactly that.
        //
        // BOTH spellings are handled, because the arm for the node type alone was
        // unreachable: the PINNED published engine models `::: |` as a div
        // carrying the `line-block` class, and only carve-js main emits a
        // dedicated `line_block` node. So every line block a user could actually
        // produce fell through to the Div branch and reached the writers as a
        // classed paragraph, while the code that would have handled it sat
        // waiting for a pin bump.
        case 'line_block':
            return [lineBlock(ctx, n)];
        case 'div': {
            const [id, classes, kvs] = toAttr(n.attrs);
            if (isLineBlockDiv(n, classes)) return [lineBlock(ctx, n)];
            return [
                P.Div([id, classes, [...kvs, ...labelKv(ctx, n)]], [
                    ...labelCaption(ctx, n),
                    ...untight(ctx, () => blocks(ctx, n.children as CNode[])),
                ]),
            ];
        }
        case 'image':
            // A sole image on its own line is a block-level node in Carve.
            return [P.Para(inline(ctx, n))];
        case 'comment':
            // Unlike the definitions below, a dropped comment IS authored
            // content leaving the document - so it is named rather than
            // silent (markup-carve/pandoc-carve#75).
            if (ctx.roundtrip) return [P.Div(provenanceAttr('comment', n), [])];
            warn(ctx, `comment: dropped - Pandoc's AST has no comment node: ${truncateForWarning(String(n.content ?? ''))}`, { construct: 'comment' }, n.pos);
            return [];
        case 'abbreviation_def':
        case 'link_reference_definition':
            // Definitions are document metadata, not output blocks. PART 12
            // section 3a puts the resolved destination and title directly on
            // each link/image node, so dropping the definition here loses no
            // information from the Pandoc document.
            return [];
        default: {
            // An inline node at block level (defensive) or an unknown block.
            const fallback = [P.Para(textInlines(plainText([n])))];
            if (ctx.roundtrip) return [P.Div(provenanceAttr('unknown-block', n), fallback)];
            warn(ctx, `block: unknown node type "${n.type}" degraded to a paragraph of its text`, { nodeType: n.type }, n.pos);
            return fallback;
        }
    }
}

function untight<T>(ctx: Ctx, fn: () => T): T {
    const prev = ctx.tight;
    ctx.tight = false;
    const result = fn();
    ctx.tight = prev;
    return result;
}

// --- Lists ---

const OL_TYPE: Record<string, P.ListNumberStyle> = {
    a: 'LowerAlpha',
    A: 'UpperAlpha',
    i: 'LowerRoman',
    I: 'UpperRoman',
};

function list(ctx: Ctx, n: CNode): P.Block {
    const tight = Boolean(n.tight);
    const items = (n.items as CNode[] | undefined) ?? [];
    const converted: P.Block[][] = items.map((item) => {
        const prev = ctx.tight;
        ctx.tight = tight;
        let itemBlocks = blocks(ctx, item.children as CNode[]);
        ctx.tight = prev;
        if (typeof item.checked === 'boolean') {
            itemBlocks = prefixTaskMarker(itemBlocks, item.checked);
        }
        return itemBlocks;
    });
    if (n.ordered) {
        const style = OL_TYPE[String(n.olType ?? '')] ?? 'Decimal';
        // `delim` lands in the Carve AST with carve-js PR 342; older parsers
        // simply leave it undefined and we emit pandoc's default.
        const delim = n.delim === ')' ? 'OneParen' : n.delim === '.' ? 'Period' : 'DefaultDelim';
        return P.OrderedList(Number(n.start ?? 1), style, converted, delim);
    }
    return P.BulletList(converted);
}

/** GFM-style task markers: pandoc renders `- [x]` as a leading ballot-box Str. */
function prefixTaskMarker(itemBlocks: P.Block[], checked: boolean): P.Block[] {
    const marker = [P.Str(checked ? '☒' : '☐'), P.Space];
    const first = itemBlocks[0];
    if (first && (first.t === 'Plain' || first.t === 'Para')) {
        return [
            { t: first.t, c: [...marker, ...(first.c as P.Inline[])] },
            ...itemBlocks.slice(1),
        ];
    }
    return [P.Plain(marker), ...itemBlocks];
}

/**
 * A definition list, from the FLAT wire sequence (PART 12): `definition_term`
 * and `definition_description` nodes in document order, exactly as `<dt>` and
 * `<dd>` appear in the rendered list.
 *
 * Pandoc's `DefinitionList` is grouped, so the grouping is recovered by the
 * rule the renderers already use and the engines agree on: a run of
 * descriptions belongs to the run of terms before it.
 */
function definitionList(ctx: Ctx, n: CNode): P.Block {
    const entries = (n.items as CNode[] | undefined) ?? [];
    const converted: [P.Inline[], P.Block[][]][] = [];
    let terms: P.Inline[][] = [];
    let defs: P.Block[][] = [];

    const flush = (): void => {
        if (!terms.length && !defs.length) return;
        // Pandoc has one term per item; multiple Carve terms join with LineBreak.
        const term = terms.length
            ? terms.reduce((acc, t) => (acc.length ? [...acc, P.LineBreak, ...t] : t), [] as P.Inline[])
            : [];
        converted.push([term, defs]);
        terms = [];
        defs = [];
    };

    for (const entry of entries) {
        if (entry?.type === 'definition_term') {
            // A term after a description starts the next entry.
            if (defs.length) flush();
            terms.push(inlines(ctx, entry.children as CNode[] | undefined));
        } else if (entry?.type === 'definition_description') {
            defs.push(untight(ctx, () => blocks(ctx, entry.children as CNode[] | undefined)));
        } else {
            warn(ctx, `definition list: unknown entry type "${String(entry?.type)}" - skipped`);
        }
    }
    flush();

    return P.DefinitionList(converted);
}

// --- Tables (span inversion) ---

interface CCell {
    header?: boolean;
    align?: string;
    span?: 'colspan' | 'rowspan';
    children?: CNode[];
    attrs?: CAttrs;
}

interface CColumn {
    align?: string;
    width?: number;
}

const ALIGN: Record<string, P.Alignment> = {
    left: 'AlignLeft',
    right: 'AlignRight',
    center: 'AlignCenter',
};

/**
 * Convert a Carve table.
 *
 * Carve marks *continuation* cells (`span: "colspan" | "rowspan"` on the cell
 * that is covered); pandoc puts rowSpan/colSpan counts on the origin Cell and
 * omits covered positions. We walk the grid, resolve each continuation to its
 * origin transitively, bump the origin's span, and emit only origin cells.
 */
function table(
    ctx: Ctx,
    n: CNode,
    caption: P.Inline[] | null,
    shortCaption: P.Inline[] | null = null,
): P.Block {
    if (!caption && Array.isArray(n.caption)) {
        ctx.captionKind = captionLabel(n.caption as CNode[]);
        caption = inlines(ctx, n.caption as CNode[]);
        ctx.captionKind = undefined;
    }
    if (!shortCaption && Array.isArray(n.shortCaption)) {
        shortCaption = inlines(ctx, n.shortCaption as CNode[]);
    }
    const rows = ((n.rows as CNode[] | undefined) ?? []).map(
        (r) => (r.cells as CCell[] | undefined) ?? [],
    );

    // PART 12 §15: an explicit partition of `rows` into head, body groups and
    // foot. Absent means the implicit structure below, which is what every
    // renderer derives anyway.
    const read = readRowGroups(n.rowGroups, rows.length);
    if (read.error) {
        warn(ctx, `table: ${read.error} - converted with the implicit head/body split instead`);
    }
    const groups = read.groups;

    // Split leading all-header rows into the table head.
    let headCount = 0;
    while (headCount < rows.length && rows[headCount]!.length > 0 && rows[headCount]!.every((c) => c.header)) {
        headCount++;
    }
    if (groups) headCount = groups.headRows;

    // Which pandoc row list each row belongs to. A cell may not span across
    // two of them: head, a body group's intermediate header, that group's
    // rows and the foot are separate `[Row]` lists in pandoc's model.
    const sectionOf: number[] = Array<number>(rows.length).fill(0);
    {
        let at = 0;
        let section = 0;
        const take = (howMany: number) => {
            for (let i = 0; i < howMany && at < rows.length; i++) sectionOf[at++] = section;
            section++;
        };
        take(headCount);
        if (groups) {
            for (const body of groups.bodies) {
                take(body.headRows);
                take(body.bodyRows);
            }
            take(groups.footRows);
        } else {
            take(rows.length - headCount);
        }
    }

    // Column alignment comes from the first row's cells, but ONLY when that row
    // is the head. Carve spells column alignment on the header marker
    // (`|=> Name |`), and a marker on a body cell aligns that cell alone -
    // measured on the engine: `|>a| b |` styles `a` and leaves the cell below
    // it untouched. Reading a body row's markers as the column's therefore
    // aligned cells the author had not aligned, in every pandoc writer, because
    // a cell with `AlignDefault` inherits its ColSpec.
    //
    // The head case moves the alignment rather than copying it: the marker on a
    // head cell IS the column's alignment, so it becomes the ColSpec and the
    // cell keeps `AlignDefault`. That is pandoc's own model, and it makes the
    // crossing exact in both directions instead of adding a per-cell override
    // that was never in the source.
    const firstRowIsHead = headCount > 0;
    const firstRow = rows[0] ?? [];
    // THE COLUMN COUNT IS THE WIDEST ROW, NOT THE FIRST. A Carve table is
    // RAGGED - PART 9 §16 keeps each row's own cell count - while a pandoc
    // table is rectangular and its ColSpec list DEFINES the width. Sizing the
    // list from the first row therefore emitted a table whose later rows have
    // cells past the last column, which is not a shape pandoc's own readers
    // produce: `| ~x~ |` above `| a | b |` declared one column, and `b` was
    // dropped on the way back with nothing reported. The alignment of a column
    // no first-row cell covers is simply unset.
    const width = Math.max(0, ...rows.map((row) => row.length));
    if (rows.some((row) => row.length < width)) {
        // Padding is the conversion, not a defect - but it is a change the
        // author can see, so it is reported like every other one.
        warn(
            ctx,
            `table: ${rows.filter((row) => row.length < width).length} row(s) shorter than the `
            + `widest (${width} cells) are padded with empty cells - a pandoc table is `
            + 'rectangular, and PART 9 §16 keeps each row\'s own cell count',
        );
    }
    const columns = (n.columns as CColumn[] | undefined) ?? [];
    const colAligns: P.Alignment[] = Array.from({ length: width }, (_, c) => {
        const declared = ALIGN[columns[c]?.align ?? ''];
        if (declared) return declared;
        const cell = firstRow[c];
        return firstRowIsHead && cell ? ALIGN[cell.align ?? ''] ?? 'AlignDefault' : 'AlignDefault';
    });

    // origin[r][c] -> the origin record covering grid position (r, c).
    interface Origin {
        cell: P.PCell;
        row: number;
        col: number;
    }
    const origin: (Origin | undefined)[][] = rows.map(() => []);
    const emitted: (P.PCell | null)[][] = rows.map((row) => row.map(() => null));

    for (let r = 0; r < rows.length; r++) {
        const row = rows[r]!;
        for (let c = 0; c < row.length; c++) {
            const cc = row[c]!;
            // Pandoc omits covered positions entirely, so a continuation that
            // RESOLVES leaves nowhere to hang its attributes. The grammar
            // cannot produce that shape (a cell carrying attributes is never a
            // bare span cell); a wire AST can. An ORPHAN continuation is a
            // different story - it falls through and becomes a real cell below,
            // which keeps them, so the warning belongs on the resolving paths
            // only.
            const droppedAttrs = (): void => {
                if (hasAttrs(cc.attrs)) {
                    warn(ctx, `table: attributes on the continuation cell at row ${r + 1}, col ${c + 1} are dropped - pandoc omits covered positions`);
                }
            };
            if (cc.span === 'colspan') {
                const org = origin[r]![c - 1];
                if (org) {
                    // max() keeps 2D blocks correct: interior continuations of
                    // a lower row must not widen the origin again.
                    if (r === org.row) org.cell.colSpan = Math.max(org.cell.colSpan, c - org.col + 1);
                    origin[r]![c] = org;
                    droppedAttrs();
                    continue;
                }
                warn(ctx, `table: colspan continuation at row ${r + 1}, col ${c + 1} has no origin - emitting empty cell`);
            } else if (cc.span === 'rowspan') {
                const org = r > 0 ? origin[r - 1]![c] : undefined;
                if (org) {
                    // POLICY: clip, do not restructure. Carve is the richer
                    // model here - its rows are one flat list, so a rowspan may
                    // start in the head and continue into the body; pandoc's
                    // TableHead and TableBody hold separate row lists and a
                    // Cell's rowSpan is confined to the section that owns it,
                    // so the covering cell has no shape on that side. The
                    // alternatives both lie about the source: moving the
                    // boundary so the span fits silently reclassifies a header
                    // row as a body row (or the reverse), and duplicating the
                    // origin's content into the body invents a second cell the
                    // author never wrote. Clipping to an empty body cell keeps
                    // the grid the right size, and the warning below says what
                    // was lost.
                    if (sectionOf[org.row] !== sectionOf[r]) {
                        warn(ctx, `table: rowspan crossing the header/body boundary at row ${r + 1}, col ${c + 1} - clipped to an empty body cell (pandoc cannot represent it)`);
                    } else {
                        // max(): a 2D block has one rowspan continuation per
                        // covered column - count rows, not continuations.
                        org.cell.rowSpan = Math.max(org.cell.rowSpan, r - org.row + 1);
                        origin[r]![c] = org;
                        droppedAttrs();
                        continue;
                    }
                } else {
                    warn(ctx, `table: rowspan continuation at row ${r + 1}, col ${c + 1} has no origin - emitting empty cell`);
                }
            }
            const cellBlocks = cc.children?.length
                ? [P.Plain(untight(ctx, () => inlines(ctx, cc.children)))]
                : [];
            // A head cell's marker became the ColSpec above, so repeating it
            // here would emit an override pandoc does not need and the source
            // never had.
            const cellAlign: P.Alignment = firstRowIsHead && r === 0
                ? 'AlignDefault'
                : ALIGN[cc.align ?? ''] ?? 'AlignDefault';
            const pc = P.cell(cellBlocks, cellAlign, toAttr(cc.attrs));
            origin[r]![c] = { cell: pc, row: r, col: c };
            emitted[r]![c] = pc;
        }
    }

    const toRows = (from: number, to: number): P.PRow[] => {
        const out: P.PRow[] = [];
        for (let r = from; r < to; r++) {
            const cells = emitted[r]!.filter((x): x is P.PCell => x !== null);
            const rowAttrs = (n.rows as CNode[])[r]?.attrs as CAttrs | undefined;
            out.push(P.row(cells, hasAttrs(rowAttrs) ? toAttr(rowAttrs) : undefined));
        }
        return out;
    };

    let bodies: P.TableBody[];
    let footRows: P.PRow[] = [];
    if (groups) {
        let at = headCount;
        bodies = groups.bodies.map((body) => {
            const headTo = at + body.headRows;
            const bodyTo = headTo + body.bodyRows;
            const converted: P.TableBody = {
                attr: toAttr(body.attrs),
                headRows: toRows(at, headTo),
                bodyRows: toRows(headTo, bodyTo),
            };
            if (body.rowHeadColumns) converted.rowHeadColumns = body.rowHeadColumns;
            at = bodyTo;
            return converted;
        });
        footRows = toRows(at, at + groups.footRows);
    } else {
        // ROW HEADERS ARE DERIVED WHEN NOTHING DECLARED THEM. A body row may
        // open with header cells (`|= Mercury | 4,879.4 |`), which the engine
        // renders as `<th scope="row">`. Pandoc says the same thing with
        // `RowHeadColumns`, a COUNT on the body - and the count was only ever
        // read from an explicit `rowGroups`, so a table that simply marked its
        // first cells came out as ordinary `<td>` and lost the row headers.
        //
        // ONE BODY PER RUN OF ROWS THAT AGREE, not one body for the table.
        //
        // This used to take the MINIMUM leading run across every body row,
        // because one `RowHeadColumns` is one number. A body whose rows disagree
        // therefore lost every row header above that minimum, and lost it
        // SILENTLY - the cells simply came out `<td>`. Corpus 354-2 is the
        // smallest case: a plain row followed by a row-header row takes the
        // minimum 0, so `<th scope="row">b c</th>` came back `<td>b c</td>`.
        //
        // Pandoc's own model has the slot for this. A `Table` holds a LIST of
        // bodies and each carries its own `RowHeadColumns`, so consecutive rows
        // that agree become one body and a change starts the next one. Nothing
        // is invented: a document with a single run still emits exactly one
        // body, which is what every table that agreed already produced.
        bodies = [];
        const leadOf = (row: CCell[]): number => {
            let n = 0;
            while (n < row.length && row[n]!.header === true) n++;
            return Math.min(n, width);
        };
        let at = headCount;
        while (at < rows.length) {
            const lead = leadOf(rows[at]!);
            let to = at + 1;
            while (to < rows.length && leadOf(rows[to]!) === lead) to++;
            const group: P.TableBody = { bodyRows: toRows(at, to) };
            if (lead > 0) group.rowHeadColumns = lead;
            bodies.push(group);
            at = to;
        }
        // A table with a head and no body rows at all still needs a body,
        // because that is the shape pandoc's own readers produce.
        if (!bodies.length) bodies = [{ bodyRows: [] }];
    }

    return P.Table(
        toAttrWithout(n.attrs as CAttrs | undefined, ['aligns', 'valigns', 'widths']),
        caption,
        colAligns,
        toRows(0, headCount),
        bodies,
        footRows,
        shortCaption,
        Array.from({ length: width }, (_, c) => columns[c]?.width ?? null),
    );
}

function toAttrWithout(attrs: CAttrs | undefined, omitted: string[]): P.Attr {
    const [id, classes, pairs] = toAttr(attrs);
    return [id, classes, pairs.filter(([key]) => !omitted.includes(key))];
}

// --- List tables (listTable extension semantics) ---

/** Sole-content span marker of a list-table cell: `<` joins left, `^` joins up. */
function spanMarker(cellBlocks: CNode[]): 'colspan' | 'rowspan' | null {
    if (cellBlocks.length !== 1) return null;
    const only = cellBlocks[0]!;
    if (only.type !== 'paragraph') return null;
    const children = (only.children as CNode[] | undefined) ?? [];
    if (children.length !== 1) return null;
    const t = children[0]!;
    if (t.type !== 'text') return null;
    const v = String(t.value).trim();
    return v === '<' ? 'colspan' : v === '^' ? 'rowspan' : null;
}

/**
 * Resolve `header-rows` like the canonical listTable extension: absent -> 0,
 * boolean form `{header-rows}` (stored as "") -> 1, explicit number -> count.
 */
function headerCount(value: string | undefined): number {
    if (value === undefined) return 0;
    if (value.trim() === '') return 1;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Returns null when the block is not strictly table-shaped (extra siblings
 * around the outer list, or a row item that is not exactly one nested list) -
 * mirroring the canonical extension, which defers those to the degraded Div
 * so authored content is never dropped.
 */
function listTableToTable(ctx: Ctx, n: CNode): P.Block | null {
    const a = (n.attrs ?? {}) as CAttrs;
    const headerRows = headerCount(a.keyValues?.['header-rows']);
    // `header-cols` promotes the first N cells of every row to row headers
    // (extensions.md §5.1), which is exactly pandoc's `RowHeadColumns`. It was
    // read by nobody and left behind as an ordinary table attribute.
    const headerCols = headerCount(a.keyValues?.['header-cols']);
    const footerRows = headerCount(a.keyValues?.['footer-rows']);
    const caption = Array.isArray(n.title) ? inlines(ctx, n.title as CNode[]) : null;

    // Strict shape: exactly one child, the outer list; every row item holds
    // exactly one child, the inner cell list.
    const children = (n.children as CNode[] | undefined) ?? [];
    if (children.length !== 1 || children[0]!.type !== 'list') return null;
    const rowItems = (children[0]!.items as CNode[] | undefined) ?? [];
    const grid: CNode[][][] = [];
    const cellItems: CNode[][] = [];
    for (const rowItem of rowItems) {
        const rowChildren = (rowItem.children as CNode[] | undefined) ?? [];
        if (rowChildren.length !== 1 || rowChildren[0]!.type !== 'list') return null;
        const items = (rowChildren[0]!.items as CNode[] | undefined) ?? [];
        cellItems.push(items);
        grid.push(
            items.map(
                (cellItem) => (cellItem.children as CNode[] | undefined) ?? [],
            ),
        );
    }

    const nCols = Math.max(0, ...grid.map((r) => r.length));

    interface Origin {
        cell: P.PCell;
        row: number;
        col: number;
    }
    const origin: (Origin | undefined)[][] = grid.map(() => []);
    const emitted: (P.PCell | null)[][] = grid.map((r) => r.map(() => null));

    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r]!.length; c++) {
            const cellBlocks = grid[r]![c]!;
            const marker = spanMarker(cellBlocks);
            if (marker === 'colspan' && origin[r]![c - 1]) {
                const org = origin[r]![c - 1]!;
                if (r === org.row) org.cell.colSpan = Math.max(org.cell.colSpan, c - org.col + 1);
                origin[r]![c] = org;
                continue;
            }
            if (marker === 'rowspan' && r > 0 && origin[r - 1]![c]) {
                const org = origin[r - 1]![c]!;
                // The list-table half of the clip-do-not-restructure policy the
                // pipe-table path states in full; same reason, same outcome.
                const crossesHead = org.row < headerRows && r >= headerRows;
                if (!crossesHead) {
                    org.cell.rowSpan = Math.max(org.cell.rowSpan, r - org.row + 1);
                    origin[r]![c] = org;
                    continue;
                }
                warn(ctx, `list-table: rowspan crossing the header/body boundary at row ${r + 1} - clipped`);
            }
            const pc = P.cell(
                untight(ctx, () => blocks(ctx, cellBlocks)),
                'AlignDefault',
                toAttr((cellItems[r]![c]!.attrs ?? {}) as CAttrs),
            );
            origin[r]![c] = { cell: pc, row: r, col: c };
            emitted[r]![c] = pc;
        }
    }

    const toRows = (from: number, to: number): P.PRow[] => {
        const out: P.PRow[] = [];
        for (let r = from; r < to; r++) {
            out.push(P.row(emitted[r]!.filter((x): x is P.PCell => x !== null)));
        }
        return out;
    };

    const head = Math.min(headerRows, grid.length);
    const [id, classes, kvs] = toAttr(a);
    const foot = Math.min(footerRows, Math.max(0, grid.length - head));
    const bodyEnd = grid.length - foot;
    const hasBareMarker = (item: CNode | undefined, key: string): boolean =>
        ((item?.attrs ?? {}) as CAttrs).keyValues?.[key] === '';
    const bodies: P.TableBody[] = [];
    let at = head;
    while (at < bodyEnd) {
        const bodyStart = at;
        let headEnd = at;
        if (hasBareMarker(cellItems[at]?.[0], 'header-row')) {
            while (headEnd < bodyEnd && hasBareMarker(cellItems[headEnd]?.[0], 'header-row')) headEnd++;
        }
        let next = headEnd;
        while (next < bodyEnd && !hasBareMarker(cellItems[next]?.[0], 'header-row')) next++;
        // A marker after ordinary rows begins the next body; the ordinary run
        // before it remains its own body with no intermediate header.
        const end = headEnd === bodyStart ? next : next;
        const body: P.TableBody = {
            ...(headEnd > bodyStart ? { headRows: toRows(bodyStart, headEnd) } : {}),
            bodyRows: toRows(headEnd, end),
        };
        if (headerCols > 0) body.rowHeadColumns = Math.min(headerCols, nCols);
        bodies.push(body);
        at = end;
    }
    if (!bodies.length) {
        const body: P.TableBody = { bodyRows: [] };
        if (headerCols > 0) body.rowHeadColumns = Math.min(headerCols, nCols);
        bodies.push(body);
    }
    return P.Table(
        [id, classes, kvs.filter(([k]) => !['header-rows', 'header-cols', 'footer-rows', 'aligns', 'widths', 'valigns'].includes(k))],
        caption,
        positionalAligns(a.keyValues?.aligns, nCols),
        toRows(0, head),
        bodies,
        toRows(bodyEnd, grid.length),
        null,
        positionalWidths(a.keyValues?.widths, nCols),
    );
}

function positionalAligns(value: string | undefined, count: number): P.Alignment[] {
    const values = value?.split(',').map((part) => ALIGN[part.trim()] ?? 'AlignDefault') ?? [];
    return Array.from({ length: count }, (_, i) => values[i] ?? 'AlignDefault');
}

function positionalWidths(value: string | undefined, count: number): Array<number | null> {
    const values = value?.split(',').map((part) => {
        const n = Number(part.trim());
        return Number.isFinite(n) && n > 0 && n <= 100 ? n / 100 : null;
    }) ?? [];
    return Array.from({ length: count }, (_, i) => values[i] ?? null);
}

// --- Figures ---

/**
 * A captioned host, which is pandoc's `Figure` - the generic captioned wrapper
 * on both sides (PART 9 §4b).
 *
 * A QUOTE IS NOT A SPECIAL HOST. carve#1161 briefly made a caption on a quote
 * an `attribution` rendered inside the `<blockquote>`, and this function
 * rerouted a quote target into that shape; the clause is withdrawn
 * (carve#1213), and PART 9 §4b now cites the HTML Standard in the other
 * direction - attribution "must be placed outside the `blockquote` element",
 * with a `<figure>` + `<figcaption>` given as the way to relate the two. So a
 * captioned quote takes the same path as a captioned code listing or a
 * captioned equation, and corpus 07-blockquote-with-attribution pins the
 * `<figure><blockquote>…<figcaption>` bytes.
 *
 * WHAT THE REROUTE BOUGHT, AND WHY IT IS NOT ENOUGH. Pandoc's plain and rst
 * writers drop a `Figure` caption wholesale, and the latex writer floats it -
 * measured on pandoc 3.5, and the reason §4a was implemented here. But they do
 * that to EVERY figure: a captioned code block loses its caption in both
 * writers today. That is a degradation of those two writers, one level below
 * the AST this bridge produces, and paying for it with a node shape the spec
 * denies would put the attribution in the one place the HTML Standard names as
 * wrong.
 */
function figure(ctx: Ctx, n: CNode): P.Block[] {
    const target = n.target as CNode | undefined;
    ctx.captionKind = captionLabel(n.caption as CNode[] | undefined);
    const caption = Array.isArray(n.caption) ? inlines(ctx, n.caption as CNode[]) : null;
    const shortCaption = Array.isArray(n.shortCaption)
        ? inlines(ctx, n.shortCaption as CNode[])
        : null;
    ctx.captionKind = undefined;
    if (!target) return [];
    if (target.type === 'table') {
        // Pandoc tables carry a native caption; no Figure wrapper needed.
        return [table(ctx, target, caption, shortCaption)];
    }
    if (target.type === 'image') {
        const img = inline(ctx, target);
        return [P.Figure(toAttr(n.attrs), caption, [P.Plain(img)], shortCaption)];
    }
    // Any other captionable target, a QUOTE INCLUDED - this is the arm a
    // captioned quote takes, at document level and as a §4c panel alike. It
    // used to be unreachable for a quote outside a group, because §4a rerouted
    // that case; nothing reroutes it now.
    return [P.Figure(toAttr(n.attrs), caption, untight(ctx, () => block(ctx, target)), shortCaption)];
}

/** The §4c panels of a group: its `figure` and `table` children, in order. */
function isPanel(n: CNode): boolean {
    return n?.type === 'figure' || n?.type === 'table';
}

/**
 * A composite figure (PART 9 §4c, carve#1122): a bare `::: figure` container
 * is ONE figure of ordered panels, and Pandoc has that model natively - a
 * `Figure` whose blocks are themselves `Figure`s is its subfigure shape. So
 * the group becomes the outer `Figure`, its caption the outer caption, and its
 * children the blocks, with the panels among them lowering to nested Figures.
 *
 * Before the engine pin carried the node, `::: figure` parsed as a generic
 * admonition and crossed as `Div ["admonition","figure"]`. That Div is gone;
 * a filter keyed on it has to key on the Figure nesting instead.
 *
 * THE NUMBER IS DRAWN AT THE OPENING FENCE, which is why the caption is
 * converted BEFORE the children even though its `^ ` line is the construct's
 * last: corpus 318-composite-figures-11 numbers the group "Figure 1" and a
 * captioned figure nested deeper inside it "Figure 2".
 *
 * PANELS ARE THE DIRECT `figure`/`table` CHILDREN, and everything else is
 * plain group content preserved IN PLACE between them (§4c, corpus
 * 318-composite-figures-5) - so the children convert in source order and
 * nothing is re-sorted into a panel array.
 *
 * A DIRECT-CHILD CAPTIONED QUOTE IS A PANEL like any other captioned host -
 * "the quote is not a special host inside the group either" (corpus
 * 318-composite-figures-10, where it renders as a panel with a figcaption).
 * It reads that way because a captioned quote is a `figure` EVERYWHERE now,
 * not because the group holds a reroute the rest of the document does not; the
 * §4a attribution that once needed one is withdrawn (carve#1213).
 */
function figureGroup(ctx: Ctx, n: CNode): P.Block[] {
    ctx.captionKind = captionLabel(n.caption as CNode[] | undefined);
    const caption = Array.isArray(n.caption) ? inlines(ctx, n.caption as CNode[]) : null;
    ctx.captionKind = undefined;

    const children = (n.children as CNode[] | undefined) ?? [];
    const body = untight(ctx, () =>
        children.flatMap((child) => {
            if (!isPanel(child)) return block(ctx, child);
            const prev = ctx.inPanel;
            ctx.inPanel = true;
            try {
                return child.type === 'figure' ? figure(ctx, child) : block(ctx, child);
            } finally {
                ctx.inPanel = prev;
            }
        }),
    );
    return [P.Figure(toAttr(n.attrs), caption, body)];
}

// --- Metadata (frontmatter) ---

/**
 * The YAML subset typical frontmatter uses, read to the depth pandoc's `Meta`
 * has: nested maps, block and flow sequences, scalars.
 *
 * Not a YAML implementation. Anchors, tags, multi-document streams, block
 * scalars and flow maps are out; a line that does not fit is reported and
 * skipped rather than guessed at. What IS in is the shape a real document
 * carries - `author: [ - name:, affiliation: ]`, `keywords:` as a block list,
 * a `bibliography` map - which used to end as an EMPTY `MetaInlines` under the
 * parent key, with one "line not understood" per child line and nothing said
 * about the parent having been emptied.
 */
function parseMeta(ctx: Ctx, frontmatter: unknown): Record<string, P.MetaValue> {
    const fm = frontmatter as { format?: string; content?: string } | undefined;
    if (!fm?.content) return {};
    if (fm.format && fm.format !== 'yaml') {
        warn(ctx, `frontmatter: format "${fm.format}" not supported - skipped`);
        return {};
    }
    const lines: YamlLine[] = [];
    // Block scalars come out FIRST, while the blank lines inside them are still
    // there: the line reader below drops blank lines (they carry no structure
    // in a mapping), and a blank line inside a literal scalar is a paragraph
    // break. Each becomes one sentinel scalar the ordinary reader can carry.
    for (const raw of liftBlockScalars(ctx, fm.content).split('\n')) {
        if (!raw.trim() || raw.trim().startsWith('#')) continue;
        lines.push({ indent: raw.length - raw.trimStart().length, text: raw.trim() });
    }
    const reader: YamlReader = { ctx, lines, at: 0 };
    const map = readMapping(reader, lines[0]?.indent ?? 0);
    // A line the mapping reader could not use never advances past it; the guard
    // is what keeps a malformed document from spinning here.
    while (reader.at < lines.length) {
        warn(ctx, `frontmatter: line not understood, skipped: ${lines[reader.at]!.text}`);
        reader.at++;
    }
    return map;
}

/**
 * A `key: |` line and the lines indented under it, replaced by one sentinel.
 *
 * The literal block scalar is the ONE YAML form that carries block content,
 * and it is the form pandoc's own markdown writer emits for `MetaBlocks` and
 * its reader turns back into `MetaBlocks` - key-agnostically, so `abstract`
 * gets no special case here either. Lifting it out before the line reader runs
 * keeps two things that would otherwise fight: the reader drops blank lines,
 * and a blank line inside the scalar is a paragraph break.
 *
 * Only the plain `|` is read. `|-`, `|+`, `>` and an explicit indentation
 * indicator are not what the writer emits, and this file's rule for the rest of
 * YAML applies to them too: a line that does not fit a known shape is reported
 * and skipped, never guessed at.
 */
const BLOCK_SCALAR_OPEN = /^(\s*)("[^"]*"|'[^']*'|[^:"'#][^:]*|[^:"'#]):[ \t]*\|[ \t]*$/;

function liftBlockScalars(ctx: Ctx, content: string): string {
    if (!content.includes('|')) return content;
    const lines = content.split('\n');
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const open = BLOCK_SCALAR_OPEN.exec(lines[i]!);
        if (!open) {
            out.push(lines[i]!);
            continue;
        }
        const keyIndent = open[1]!.length;
        const body: string[] = [];
        let j = i + 1;
        for (; j < lines.length; j++) {
            const line = lines[j]!;
            const deeper = line.trim() !== '' && line.length - line.trimStart().length > keyIndent;
            if (!deeper && line.trim() !== '') break;
            body.push(line);
        }
        // Trailing blank lines belong to whatever follows, not to the scalar.
        while (body.length && body[body.length - 1]!.trim() === '') body.pop();
        if (!body.length) {
            out.push(lines[i]!);
            continue;
        }
        const strip = Math.min(
            ...body.filter((l) => l.trim() !== '').map((l) => l.length - l.trimStart().length),
        );
        // A NUL cannot occur in the frontmatter of a real document and is
        // not whitespace, so the sentinel survives the reader's `trim()`
        // and can never be confused with a scalar the author wrote.
        const sentinel = `\u0000block${ctx.blockScalars.size}\u0000`;
        ctx.blockScalars.set(sentinel, body.map((l) => l.slice(strip)).join('\n') + '\n');
        out.push(`${open[1]}${open[2]}: ${sentinel}`);
        i = j - 1;
    }
    return out.join('\n');
}

/**
 * The Carve markup inside a literal block scalar, as `MetaBlocks`.
 *
 * This is the half of the round trip that used to be missing, and its absence
 * was the whole argument for dropping `MetaBlocks` on the way out: the value
 * "makes the frontmatter carry markup that nothing on the reading side
 * parses". Something does now, so the value survives both ways - the same
 * bargain pandoc's own markdown reader and writer strike over `abstract: |`.
 */
function blockScalarValue(ctx: Ctx, key: string, source: string): P.MetaValue {
    if (!ctx.parseBlocks) {
        // The AST entry points supply the parser; a caller reaching `convert`
        // directly has no engine to lend, and the old skip is still the honest
        // answer there.
        warn(
            ctx,
            `frontmatter: block content under "${key}" needs a Carve parser to read - `
            + 'use carveToPandoc / carveAstToPandoc, which supply one; skipped',
        );
        return P.MetaInlines([]);
    }
    const children = ctx.parseBlocks(source) as CNode[];
    return P.MetaBlocks(blocks(ctx, children));
}

interface YamlLine {
    indent: number;
    text: string;
}

interface YamlReader {
    ctx: Ctx;
    lines: YamlLine[];
    at: number;
}

/**
 * A `key:` line. The unquoted alternative must not OPEN with a quote, or a
 * quoted scalar holding a colon (`- "scope: local"`) matches it and becomes a
 * map whose key is `"scope` - pandoc reads that item as one string.
 */
const KEY_LINE = /^("[^"]*"|'[^']*'|[^:"'][^:]*|[^:"']):(?:\s+(.*))?$/;

/** A mapping runs while lines sit at exactly `indent` and look like keys. */
function readMapping(r: YamlReader, indent: number): Record<string, P.MetaValue> {
    const out: Record<string, P.MetaValue> = {};
    while (r.at < r.lines.length) {
        const line = r.lines[r.at]!;
        if (line.indent !== indent || line.text.startsWith('- ') || line.text === '-') break;
        const m = KEY_LINE.exec(line.text);
        if (!m) break;
        const key = unquoteYaml(m[1]!);
        const inline = (m[2] ?? '').trim();
        r.at++;
        out[key] = inline !== '' ? scalarValue(r.ctx, key, inline) : readChild(r, indent, key);
    }
    return out;
}

/** A sequence runs while lines sit at exactly `indent` and open with `-`. */
function readSequence(r: YamlReader, indent: number): P.MetaValue[] {
    const out: P.MetaValue[] = [];
    while (r.at < r.lines.length) {
        const line = r.lines[r.at]!;
        if (line.indent !== indent || !(line.text === '-' || line.text.startsWith('- '))) break;
        const rest = line.text.slice(1).trim();
        if (rest === '') {
            r.at++;
            out.push(readChild(r, indent, ''));
            continue;
        }
        const m = KEY_LINE.exec(rest);
        if (m) {
            // `- name: Ada` opens a map whose later keys align under `name`, so
            // the item's own indent is where that key starts, not the dash.
            const keyIndent = indent + (line.text.length - rest.length);
            r.lines[r.at] = { indent: keyIndent, text: rest };
            out.push(P.MetaMap(readMapping(r, keyIndent)));
            continue;
        }
        r.at++;
        out.push(scalarValue(r.ctx, '', rest));
    }
    return out;
}

/**
 * The value written under a key that had none on its own line: whatever sits at
 * the next deeper indent. Nothing deeper means an empty value, which is YAML's
 * own reading of `key:` alone.
 */
function readChild(r: YamlReader, indent: number, key: string): P.MetaValue {
    const next = r.lines[r.at];
    if (!next || next.indent <= indent) return P.MetaInlines([]);
    if (next.text === '-' || next.text.startsWith('- ')) {
        return P.MetaList(readSequence(r, next.indent));
    }
    const map = readMapping(r, next.indent);
    if (Object.keys(map).length) return P.MetaMap(map);
    // Nothing consumed at that indent: the reader would not advance, so report
    // it here rather than leaving the caller to spin.
    warn(r.ctx, `frontmatter: value under "${key}" not understood, skipped: ${next.text}`);
    r.at++;
    return P.MetaInlines([]);
}

function unquoteYaml(s: string): string {
    const t = s.trim();
    if ((t.startsWith('"') && t.endsWith('"') && t.length > 1)
        || (t.startsWith("'") && t.endsWith("'") && t.length > 1)) {
        return t.slice(1, -1);
    }
    return t;
}

/**
 * The boolean and null spellings YAML resolves as such, matching what pandoc's
 * own frontmatter reader does - it reads the 1.1 set, so `on`, `yes` and a bare
 * `y` are booleans there too, not strings.
 *
 * Matching that set exactly is the point. A `draft: true` arriving as
 * `MetaInlines "true"` is not a near miss: every pandoc template and filter
 * tests metadata for truthiness, and a non-empty string is true, so
 * `draft: false` written in Carve turns the draft flag ON once it crosses the
 * bridge. The value only has to survive a `MetaBool` on the way out (the writer
 * has always emitted `true`/`false`) for the round-trip to keep the type.
 *
 * A QUOTED scalar is never a boolean, which is why the test runs on the raw
 * text before {@link unquoteYaml} sees it.
 */
const YAML_TRUE = /^(y|Y|yes|Yes|YES|true|True|TRUE|on|On|ON)$/;
const YAML_FALSE = /^(n|N|no|No|NO|false|False|FALSE|off|Off|OFF)$/;
const YAML_NULL = /^(~|null|Null|NULL)$/;

function scalarValue(ctx: Ctx, key: string, raw: string): P.MetaValue {
    const blockScalar = ctx.blockScalars.get(raw);
    if (blockScalar !== undefined) return blockScalarValue(ctx, key, blockScalar);
    // `{}` is the only flow map read: an EMPTY one, which is what the writer
    // emits for a `MetaMap` with no entries. A populated flow map is not in the
    // subset and falls through to being read as a string, same as before.
    if (raw.replace(/\s+/g, '') === '{}') return P.MetaMap({});
    if (raw.startsWith('[') && raw.endsWith(']')) {
        const items = raw
            .slice(1, -1)
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s !== '' && unquoteYaml(s) !== '');
        // Items are typed by the same rules as a scalar on its own line, so a
        // `[true, draft]` list keeps the boolean and the word apart.
        return P.MetaList(items.map((s) => scalarValue(ctx, '', s)));
    }
    if (YAML_TRUE.test(raw)) return P.MetaBool(true);
    if (YAML_FALSE.test(raw)) return P.MetaBool(false);
    // Pandoc reads a null scalar as the empty string rather than dropping the
    // key, so the key stays present and empty here too.
    if (YAML_NULL.test(raw)) return P.MetaString('');
    const value = unquoteYaml(raw);
    // Lists where pandoc conventionally expects lists, inlines elsewhere.
    if (key === 'author' || key === 'authors') {
        return P.MetaList([P.MetaInlines(textInlines(value))]);
    }
    return P.MetaInlines(textInlines(value));
}

// --- Entry point ---

export function convert(ast: CarveAstDocument, options: ConvertOptions = {}): ConvertResult {
    // PART 12 section 7: frontmatter and footnote DEFINITIONS are block nodes
    // in `children`, not fields on the root. They are lifted out here rather
    // than converted in place - frontmatter becomes pandoc `meta`, and a
    // definition is emitted at each reference, inside the Note.
    const children = (ast.children as CNode[] | undefined) ?? [];
    const footnoteDefs: Record<string, CNode[]> = {};
    let frontmatter: CNode | undefined;
    const body: CNode[] = [];
    for (const child of children) {
        if (child?.type === 'frontmatter' && frontmatter === undefined) {
            frontmatter = child;
        } else if (child?.type === 'footnote' && typeof child.label === 'string') {
            // First definition wins, matching the engine's own resolution.
            footnoteDefs[child.label] ??= (child.children as CNode[] | undefined) ?? [];
        } else {
            body.push(child);
        }
    }

    const ctx: Ctx = {
        warnings: [],
        diagnostics: [],
        footnoteDefs,
        crossrefTargets: new Map(),
        headingIdByText: new Map(),
        captionTargets: new Set(),
        tight: false,
        inCrossref: false,
        captionCounts: new Map(),
        captionKind: undefined,
        inPanel: false,
        roundtrip: options.roundtrip ?? false,
        symbols: options.symbols ?? {},
        listTable: options.listTable ?? true,
        noteCount: 0,
        parseBlocks: options.parseBlocks,
        blockScalars: new Map(),
    };

    // Pass 1: collect crossref targets - heading ids (explicit, plus computed
    // slugs) and numbered figure/table caption ids - before any block is
    // converted, so `heading_ref` resolves regardless of where a crossref
    // sits relative to its target.
    collectCrossrefTargets(ctx, body, new Map());

    const meta = parseMeta(ctx, frontmatter);

    return {
        doc: {
            'pandoc-api-version': [...P.PANDOC_API_VERSION],
            meta,
            blocks: blocks(ctx, body),
        },
        warnings: ctx.warnings,
        diagnostics: ctx.diagnostics,
    };
}

/**
 * Pass 1: walk the whole document before any block is converted, registering
 * every target a `heading_ref` (`</#id>`) can resolve to.
 *
 * Two kinds of target:
 *  - a heading's own id (explicit, or slugged from its text) -> its inline
 *    children, rendered verbatim as the crossref's link text.
 *  - a numbered figure/table caption's id (the `{#id}` attached to the
 *    figure or table itself) -> the computed "Label N" text, e.g.
 *    "Figure 1" - docs-extensions.md: "`</#id>` to the element resolves to
 *    label + number".
 *
 * The caption number is assigned per LABEL in document order (`captionLabel`
 * plus a running count) - exactly like `ctx.captionCounts` in pass 2 (see the
 * `caption_number` case in `inline()`). Pass 1 runs before pass 2 and cannot
 * read its counts, so it keeps its OWN counter here (`captionCounts`,
 * threaded through the recursion), walking captioned nodes in the same order
 * pass 2 will. The two counters land on identical numbers only because both
 * walk the same document the same way - a captioned element with no `{#id}`
 * still has to bump the counter (it consumes a number in pass 2 even though
 * nothing can ever crossref it), or a LATER captioned element's number here
 * would drift out of sync with what pass 2 actually renders.
 *
 * A `figure`/`table` node's own `caption` field is read directly - the same
 * field `figure()`/`table()` read in pass 2 - which also handles a table
 * nested under a figure with no caption of its own: the recursion below
 * reaches that inner `table` node too, and its own `caption`/`attrs.id` are
 * picked up there instead, mirroring `table()`'s fallback. Table cells are
 * not recursed into, matching the pre-existing limitation for headings
 * nested inside a table.
 *
 * `inPanel` is the third kind of target and the §4c suppression in one flag:
 * inside a composite figure's panel nothing draws a number, so nothing there
 * registers either - see `figureGroupTargets`.
 */
function collectCrossrefTargets(
    ctx: Ctx,
    nodes: CNode[],
    captionCounts: Map<string, number>,
    inPanel = false,
): void {
    for (const n of nodes) {
        if (n.type === 'figure_group') {
            figureGroupTargets(ctx, n, captionCounts, inPanel);
            continue;
        }
        if (n.type === 'heading') {
            const children = (n.children as CNode[] | undefined) ?? [];
            const a = (n.attrs ?? {}) as CAttrs;
            const id = a.id ?? slugify(plainText(children));
            if (id && !ctx.crossrefTargets.has(id)) ctx.crossrefTargets.set(id, children);
            const text = plainText(children).trim().toLowerCase();
            // First heading wins, the same way the id map resolves a duplicate.
            if (id && text && !ctx.headingIdByText.has(text)) ctx.headingIdByText.set(text, id);
        } else if (!inPanel && (n.type === 'figure' || n.type === 'table')) {
            // Every figure counts, whatever it wraps. A quote used to be
            // excluded here, because §4a made a captioned quote an attribution
            // that drew no number; that clause is withdrawn (carve#1213), and
            // a quote figure numbers like the code listing beside it.
            const caption = n.caption as CNode[] | undefined;
            if (Array.isArray(caption) && caption.some((x) => x?.type === 'caption_number')) {
                const label = captionLabel(caption) ?? 'caption';
                const next = (captionCounts.get(label) ?? 0) + 1;
                captionCounts.set(label, next);
                const a = (n.attrs ?? {}) as CAttrs;
                if (a.id && !ctx.crossrefTargets.has(a.id)) {
                    ctx.crossrefTargets.set(a.id, [{ type: 'text', value: `${label} ${next}` }]);
                    ctx.captionTargets.add(a.id.toLowerCase());
                }
            }
        }
        for (const key of ['children', 'items', 'target'] as const) {
            const v = n[key];
            if (Array.isArray(v)) collectCrossrefTargets(ctx, v as CNode[], captionCounts, inPanel);
            else if (v && typeof v === 'object') {
                collectCrossrefTargets(ctx, [v as CNode], captionCounts, inPanel);
            }
        }
    }
}

/**
 * The `</#id>` targets a composite figure contributes (PART 9 §4c).
 *
 * The GROUP draws one number from its label's sequence, at its OPENING fence -
 * before anything inside it, which is what makes corpus
 * 318-composite-figures-11 number the group "Figure 1" and a figure nested
 * inside its stray content "Figure 2".
 *
 * A PANEL - a direct `figure` or `table` child - draws nothing, and its id
 * resolves as the group's number plus a letter by panel order: "Figure 2a"
 * (corpus 318-composite-figures-2), a..z then aa, ab, ... A group whose
 * caption carries no `#` has no number to lend, so it registers nothing for
 * its panels either.
 *
 * The suppression covers everything a panel CONTAINS, not just the panel's own
 * caption. Stray non-panel content numbers normally, exactly as it would
 * outside the group.
 */
function figureGroupTargets(
    ctx: Ctx,
    n: CNode,
    captionCounts: Map<string, number>,
    inPanel: boolean,
): void {
    const caption = n.caption as CNode[] | undefined;
    let resolved: string | undefined;
    if (
        !inPanel &&
        Array.isArray(caption) &&
        caption.some((x) => x?.type === 'caption_number')
    ) {
        const label = captionLabel(caption) ?? 'caption';
        const next = (captionCounts.get(label) ?? 0) + 1;
        captionCounts.set(label, next);
        resolved = `${label} ${next}`;
        const a = (n.attrs ?? {}) as CAttrs;
        if (a.id && !ctx.crossrefTargets.has(a.id)) {
            ctx.crossrefTargets.set(a.id, [{ type: 'text', value: resolved }]);
            ctx.captionTargets.add(a.id.toLowerCase());
        }
    }

    let panelIndex = 0;
    for (const child of (n.children as CNode[] | undefined) ?? []) {
        if (!isPanel(child)) {
            collectCrossrefTargets(ctx, [child], captionCounts, inPanel);
            continue;
        }
        const a = (child.attrs ?? {}) as CAttrs;
        const letter = panelLetter(panelIndex++);
        if (resolved && a.id && !ctx.crossrefTargets.has(a.id)) {
            ctx.crossrefTargets.set(a.id, [{ type: 'text', value: `${resolved}${letter}` }]);
        }
        collectCrossrefTargets(ctx, [child], captionCounts, true);
    }
}

/**
 * The §4c panel letter for panel index `k` (0-based): `a`..`z`, then `aa`,
 * `ab`, ... - bijective base 26, the same function the engine resolves with.
 */
function panelLetter(k: number): string {
    let out = '';
    let i = k + 1;
    while (i > 0) {
        i--;
        out = String.fromCharCode(97 + (i % 26)) + out;
        i = Math.floor(i / 26);
    }
    return out;
}
