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
     */
    listTable?: boolean;
}

interface Ctx {
    warnings: string[];
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
    roundtrip: boolean;
    symbols: Record<string, string>;
    listTable: boolean;
}

function warn(ctx: Ctx, msg: string): void {
    ctx.warnings.push(msg);
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
    for (const n of nodes) out.push(...inline(ctx, n));
    return joinAdjacentStr(out);
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
        case 'link':
            return [
                P.Link(toAttr(n.attrs), kids(ctx, n), [
                    String(n.href ?? ''),
                    String(n.title ?? ''),
                ]),
            ];
        case 'autolink': {
            const href = String(n.href ?? '');
            const cls = href.startsWith('mailto:') ? 'email' : 'uri';
            return [P.Link(P.attr(undefined, [cls]), [P.Str(String(n.text ?? href))], [href, ''])];
        }
        case 'image':
            return [
                P.Image(toAttr(n.attrs), textInlines(String(n.alt ?? '')), [
                    String(n.src ?? ''),
                    String(n.title ?? ''),
                ]),
            ];
        case 'caption_number': {
            // The `#` in `^ Figure #: text`. It has no value in the tree - the
            // renderer assigns one - so it was degrading to empty and the
            // caption reached pandoc as `Figure : text`, silently unnumbered
            // in every writer.
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
                ctx.inCrossref = true;
                try {
                    return [
                        P.Link(P.attr(undefined, ['crossref']), inlines(ctx, found), [
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
            if (Array.isArray(n.inline)) {
                return [P.Note([P.Para(inlines(ctx, n.inline as CNode[]))])];
            }
            const id = String(n.id ?? '');
            const def = ctx.footnoteDefs[id];
            if (!def) {
                warn(ctx, `footnote: missing definition for [^${id}]`);
                return [P.Superscript([P.Str(id)])];
            }
            return [P.Note(blocks(ctx, def))];
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
            return [];
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
            warn(ctx, `inline: unknown node type "${n.type}" degraded to its text content`);
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
        if (item.locatorLabel) {
            warn(ctx, `citation: @${key}'s typed locator (${item.locatorLabel}) is serialized into the pandoc citation suffix - pandoc's Citation has no locator field`);
        }
        return P.citation(
            key,
            mode,
            item.prefix?.length ? inlines(ctx, item.prefix) : [],
            citationSuffix(ctx, item),
        );
    });
    return P.Cite(citations, textInlines(String(n.raw ?? '')));
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
const ATTR_CARRYING = new Set(['heading', 'code_block', 'table', 'figure', 'div', 'admonition']);

function block(ctx: Ctx, n: CNode): P.Block[] {
    const result = blockInner(ctx, n);
    // A block-attribute line can attach attrs to ANY block. Pandoc's Para,
    // BlockQuote, lists etc. have no Attr slot - preserve via a Div wrapper.
    const a = n.attrs as CAttrs | undefined;
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
        case 'abbreviation_def':
        case 'link_reference_definition':
            // Definitions are document metadata, not output blocks. PART 12
            // section 3a puts the resolved destination and title directly on
            // each link/image node, so dropping the definition here loses no
            // information from the Pandoc document.
            return [];
        default: {
            // An inline node at block level (defensive) or an unknown block.
            warn(ctx, `block: unknown node type "${n.type}" degraded to a paragraph of its text`);
            return [P.Para(textInlines(plainText([n])))];
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

    // Column alignments come from the first row's cells.
    const firstRow = rows[0] ?? [];
    const colAligns: P.Alignment[] = firstRow.map((c) => ALIGN[c.align ?? ''] ?? 'AlignDefault');

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
            const pc = P.cell(cellBlocks, ALIGN[cc.align ?? ''] ?? 'AlignDefault', toAttr(cc.attrs));
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
        // The implicit structure: everything after the head is one body.
        bodies = [{ bodyRows: toRows(headCount, rows.length) }];
    }

    return P.Table(
        toAttr(n.attrs),
        caption,
        colAligns,
        toRows(0, headCount),
        bodies,
        footRows,
        shortCaption,
    );
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
    const caption = Array.isArray(n.title) ? inlines(ctx, n.title as CNode[]) : null;

    // Strict shape: exactly one child, the outer list; every row item holds
    // exactly one child, the inner cell list.
    const children = (n.children as CNode[] | undefined) ?? [];
    if (children.length !== 1 || children[0]!.type !== 'list') return null;
    const rowItems = (children[0]!.items as CNode[] | undefined) ?? [];
    const grid: CNode[][][] = [];
    for (const rowItem of rowItems) {
        const rowChildren = (rowItem.children as CNode[] | undefined) ?? [];
        if (rowChildren.length !== 1 || rowChildren[0]!.type !== 'list') return null;
        grid.push(
            ((rowChildren[0]!.items as CNode[] | undefined) ?? []).map(
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
            const pc = P.cell(untight(ctx, () => blocks(ctx, cellBlocks)));
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
    const body: P.TableBody = { bodyRows: toRows(head, grid.length) };
    if (headerCols > 0) body.rowHeadColumns = Math.min(headerCols, nCols);
    return P.Table(
        [id, classes, kvs.filter(([k]) => k !== 'header-rows' && k !== 'header-cols')],
        caption,
        Array<P.Alignment>(nCols).fill('AlignDefault'),
        toRows(0, head),
        [body],
    );
}

// --- Figures ---

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
    // any other captionable target (a quote never reaches here - see above)
    return [P.Figure(toAttr(n.attrs), caption, untight(ctx, () => block(ctx, target)), shortCaption)];
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
    for (const raw of fm.content.split('\n')) {
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
        out[key] = inline !== '' ? scalarValue(key, inline) : readChild(r, indent, key);
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
        out.push(scalarValue('', rest));
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

function scalarValue(key: string, raw: string): P.MetaValue {
    // `{}` is the only flow map read: an EMPTY one, which is what the writer
    // emits for a `MetaMap` with no entries. A populated flow map is not in the
    // subset and falls through to being read as a string, same as before.
    if (raw.replace(/\s+/g, '') === '{}') return P.MetaMap({});
    if (raw.startsWith('[') && raw.endsWith(']')) {
        const items = raw
            .slice(1, -1)
            .split(',')
            .map(unquoteYaml)
            .filter((s) => s !== '');
        return P.MetaList(items.map((s) => P.MetaInlines(textInlines(s))));
    }
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
        footnoteDefs,
        crossrefTargets: new Map(),
        tight: false,
        inCrossref: false,
        captionCounts: new Map(),
        captionKind: undefined,
        roundtrip: options.roundtrip ?? false,
        symbols: options.symbols ?? {},
        listTable: options.listTable ?? false,
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
 */
function collectCrossrefTargets(ctx: Ctx, nodes: CNode[], captionCounts: Map<string, number>): void {
    for (const n of nodes) {
        if (n.type === 'heading') {
            const children = (n.children as CNode[] | undefined) ?? [];
            const a = (n.attrs ?? {}) as CAttrs;
            const id = a.id ?? slugify(plainText(children));
            if (id && !ctx.crossrefTargets.has(id)) ctx.crossrefTargets.set(id, children);
        } else if (n.type === 'figure' || n.type === 'table') {
            const caption = n.caption as CNode[] | undefined;
            if (Array.isArray(caption) && caption.some((x) => x?.type === 'caption_number')) {
                const label = captionLabel(caption) ?? 'caption';
                const next = (captionCounts.get(label) ?? 0) + 1;
                captionCounts.set(label, next);
                const a = (n.attrs ?? {}) as CAttrs;
                if (a.id && !ctx.crossrefTargets.has(a.id)) {
                    ctx.crossrefTargets.set(a.id, [{ type: 'text', value: `${label} ${next}` }]);
                }
            }
        }
        for (const key of ['children', 'items', 'target'] as const) {
            const v = n[key];
            if (Array.isArray(v)) collectCrossrefTargets(ctx, v as CNode[], captionCounts);
            else if (v && typeof v === 'object') collectCrossrefTargets(ctx, [v as CNode], captionCounts);
        }
    }
}
