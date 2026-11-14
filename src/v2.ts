/** Carve 0.2 bridge. The vendored engine is a single import to swap at release. */
import { parse, treesEqual, validateTree, writeWithDiagnostics } from '../vendor/carve-v2/index.js';
import type { Node, DocumentNode, Block, Inline, Attrs, TableNode, TableRowNode, TableCellNode, CaptionNode } from '../vendor/carve-v2/index.js';
import * as P from './pandoc.js';
import { hasDeniedScheme } from './url-scheme.js';
import { isDangerousAttrName, renderedAttrValue } from './attribute-sanitize.js';

export { treesEqual };
export type { DocumentNode, Node };
type Result = { doc: P.PandocDoc; warnings: string[] };
type Context = { warnings: string[]; notes: Map<string, Block[]>; links: Map<string, [string, string]>; targets: Map<string, P.Inline[]>; noteCount: number };
const impossible = (node: never): never => { throw new Error(`unhandled node ${JSON.stringify(node)}`); };
const attr = (a?: Attrs): P.Attr => P.attr(a?.id, a?.classes, a?.keyValues);
const BIDI_CONTROL_RE = /[\u202a-\u202e\u2066-\u2069]/gu;
const stripBidi = (value: string): string => value.replace(BIDI_CONTROL_RE, '');
const words = (s: string): P.Inline[] => stripBidi(s).split(/( +)/u).filter(Boolean).map(x => /^ +$/u.test(x) ? P.Space : P.Str(x));
const literalInlines = (s: string): P.Inline[] => stripBidi(s).split(/(\r?\n|[ \t]+)/u).filter(Boolean).flatMap(x => /\r?\n/u.test(x) ? [P.SoftBreak] : /^[ \t]+$/u.test(x) ? [...x].map(() => P.Space) : [P.Str(x)]);
const captionText = (xs: Inline[]): string => xs.map(node => node.type === 'text' ? node.value : 'children' in node ? captionText(node.children as Inline[]) : '').join('');
const il = (xs: Inline[], c: Context): P.Inline[] => {
  const out: P.Inline[] = [];
  for (let i = 0; i < xs.length; i++) {
    const node = xs[i]!;
    if (node.type === 'comment') { out.push(P.RawInline(`carve-comment-${node.form}`, node.value)); continue; }
    if (node.type === 'smart_punctuation' && (node.kind === 'left_single_quote' || node.kind === 'left_double_quote')) {
      const close = node.kind === 'left_single_quote' ? 'right_single_quote' : 'right_double_quote';
      let depth = 1;
      let end = i + 1;
      for (; end < xs.length; end++) {
        const next = xs[end];
        if (next?.type !== 'smart_punctuation') continue;
        if (next.kind === node.kind) depth++;
        if (next.kind === close && --depth === 0) break;
      }
      if (end < xs.length) {
        out.push({ t: 'Quoted', c: [{ t: node.kind === 'left_single_quote' ? 'SingleQuote' : 'DoubleQuote' }, il(xs.slice(i + 1, end), c)] });
        i = end;
        continue;
      }
    }
    out.push(...emit(node, c));
  }
  return out;
};
const bl = (xs: Block[], c: Context): P.Block[] => xs.flatMap(x => emit(x, c));
const cap = (x: CaptionNode | undefined, c: Context): P.Inline[] | null => x ? bl(x.children, c).flatMap(b => (b.t === 'Plain' || b.t === 'Para') ? b.c as P.Inline[] : []) : null;
const alignment = (x?: string): P.Alignment => x === 'left' ? 'AlignLeft' : x === 'right' ? 'AlignRight' : x === 'center' ? 'AlignCenter' : 'AlignDefault';
const safeTarget = (value: string, c: Context): string => { if (hasDeniedScheme(value)) { c.warnings.push('destination-denied: URL scheme is not allowed in Pandoc output'); return ''; } return value; };
const titleCarrier = (title?: Inline[]): [string, string][] => title === undefined ? [] : [['carve-title', JSON.stringify(title, (key, value) => key === 'pos' || key === 'segments' ? undefined : value)]];
const captionCarrier = (caption?: CaptionNode): [string, string][] => caption === undefined ? [] : [['carve-caption', JSON.stringify(caption, (key, value) => key === 'pos' || key === 'segments' ? undefined : value)]];
const openingBlocks = (title: Inline[] | undefined, groupLabel: string | undefined, c: Context): P.Block[] => [
  ...(title === undefined ? [] : [P.Para([P.Strong(il(title, c))])]),
  ...(groupLabel === undefined ? [] : [P.Para([P.Strong(words(groupLabel))])]),
];
const inlineAttr = (n: Inline, child: P.Inline): P.Inline => n.attrs ? P.Span(P.attr(n.attrs.id, ['carve-inline-attrs', ...(n.attrs.classes ?? [])], [...(n.attrs.keyValues ?? []), ['carve-inline-type', n.type]]), [child]) : child;
function cell(x: TableCellNode, c: Context, headerSection: boolean): P.PCell { return { attr: P.attr(x.attrs?.id, x.attrs?.classes, [...(x.attrs?.keyValues ?? []), ...(x.span ? [['carve-span', x.span] as [string, string]] : []), ...(x.scope ? [['carve-scope', x.scope] as [string, string]] : []), ...(x.headerIds ? [['carve-header-ids', JSON.stringify(x.headerIds)] as [string, string]] : []), ...(x.header && !headerSection ? [['carve-header', '1'] as [string, string]] : [])]), align: alignment(x.align), rowSpan: x.rowspan ?? 1, colSpan: x.colspan ?? 1, blocks: x.children.flatMap(n => n.type === 'cell_paragraph' ? [P.Plain(il(n.children, c))] : emit(n, c)) }; }
function rows(xs: (TableRowNode | { type: 'comment' })[], c: Context, headerSection = false): P.PRow[] { return xs.flatMap(x => {
  if (x.type !== 'table_row') return [];
  const covered = x.children.flatMap((cell, index) => cell.span ? [{ index, cell: JSON.parse(JSON.stringify(cell, (key, value) => key === 'pos' || key === 'segments' ? undefined : value)) }] : []);
  const extras: [string, string][] = covered.length ? [['carve-covered-cells', JSON.stringify(covered)]] : [];
  return [P.row(x.children.filter(y => y.span === undefined).map(y => cell(y, c, headerSection)), P.attr(x.attrs?.id, x.attrs?.classes, [...(x.attrs?.keyValues ?? []), ...extras]))];
}); }
function table(x: TableNode, c: Context): P.Block {
  const heads = x.children.filter(n => n.type === 'table_head');
  const bodies = x.children.filter(n => n.type === 'table_body');
  const feet = x.children.filter(n => n.type === 'table_foot');
  for (const section of x.children) {
    if (section.type !== 'table_head' && section.type !== 'table_body' && section.type !== 'table_foot') continue;
    const sectionRows = section.children.filter(n => n.type === 'table_row');
    sectionRows.forEach((row, rowIndex) => row.children.forEach((cell, colIndex) => {
      if ((cell.rowspan ?? 1) > sectionRows.length - rowIndex) c.warnings.push(`table_cell: rowspan crosses ${section.type} boundary at row ${rowIndex + 1}, col ${colIndex + 1}`);
    }));
  }
  const columnFacts = x.columns.some(n => n.resolvedAlign !== undefined || n.valign !== undefined) ? [['carve-columns', JSON.stringify(x.columns.map(n => ({ align: n.align, width: n.width, valign: n.valign, authored: n.authored })))] as [string, string]] : [];
  return P.Table(P.attr(x.attrs?.id, x.attrs?.classes, [...(x.attrs?.keyValues ?? []), ...columnFacts]), cap(x.caption, c), x.columns.map(n => alignment(n.resolvedAlign ?? n.align)), heads.flatMap(n => rows(n.children, c, true)), bodies.map(n => ({ attr: P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.headRows === 0 ? [['carve-head-rows', '0'] as [string, string]] : [])]), rowHeadColumns: n.rowHeadColumns, headRows: n.headRows === undefined ? [] : rows(n.children.filter(y => y.type === 'table_row').slice(0, n.headRows), c), bodyRows: rows(n.children.filter(y => y.type === 'table_row').slice(n.headRows ?? 0), c) })), feet.flatMap(n => rows(n.children, c)), x.caption?.short ? il(x.caption.short, c) : null, x.columns.map(n => n.width ?? null), attr(heads[0]?.attrs), attr(feet[0]?.attrs));
}
/** Every public 0.2 node has an explicit case; a new type is a compiler error. */
function emit(n: Node, c: Context): P.PandocNode[] {
  if ('value' in n && typeof n.value === 'string' && BIDI_CONTROL_RE.test(n.value)) c.warnings.push(`${n.type}: bidi control stripped`);
  BIDI_CONTROL_RE.lastIndex = 0;
  for (const [key, value] of n.attrs?.keyValues ?? []) {
    if (isDangerousAttrName(key)) c.warnings.push(`${n.type}: unsafe attribute name ${key} removed`);
    else if (renderedAttrValue(key, value) !== value) c.warnings.push(`${n.type}: unsafe attribute value ${key} blanked`);
  }
  if (n.lang !== undefined || n.dir !== undefined || n.data !== undefined || (n.metadata !== undefined && n.type !== 'document')) c.warnings.push(`${n.type}: language, direction, data, or metadata may not survive Pandoc JSON`);
  if (n.type === 'image' && (n.decorative !== undefined || n.resourceId !== undefined || n.targetKind !== undefined)) c.warnings.push('image: decorative, resource, or target kind field has no Pandoc slot');
  if (n.type === 'link' && n.targetKind !== undefined) c.warnings.push('link: target kind has no Pandoc slot');
  if ((n.type === 'div' || n.type === 'admonition' || n.type === 'directive' || n.type === 'code_block') && n.title !== undefined) c.warnings.push(`${n.type}: title uses a bridge-specific Pandoc attribute`);
  if (n.type === 'figure' && n.kind !== undefined) c.warnings.push('figure: kind uses a bridge-specific Pandoc attribute');
  if (n.type === 'document' && (n.extensions !== undefined || n.resources !== undefined)) c.warnings.push('document: extensions and resource manifest have no Pandoc slot');
  switch (n.type) {
    case 'document': return n.children.flatMap(x => emit(x, c));
    case 'text': return words(n.value);
    case 'soft_break': return [P.SoftBreak];
    case 'hard_break': return [P.LineBreak];
    case 'non_breaking_space': return [P.Str('\u00a0')];
    case 'emphasis': return [inlineAttr(n, P.Emph(il(n.children, c)))];
    case 'strong': return [inlineAttr(n, P.Strong(il(n.children, c)))];
    case 'underline': return [inlineAttr(n, P.Underline(il(n.children, c)))];
    case 'strike': return [inlineAttr(n, P.Strikeout(il(n.children, c)))];
    case 'subscript': return [inlineAttr(n, P.Subscript(il(n.children, c)))];
    case 'superscript': return [inlineAttr(n, P.Superscript(il(n.children, c)))];
    case 'small_caps': return [P.SmallCaps(il(n.children, c))];
    case 'span': return [P.Span(attr(n.attrs), il(n.children, c))];
    case 'highlight': return [P.Span(P.attr(n.attrs?.id, ['mark', ...(n.attrs?.classes ?? [])], n.attrs?.keyValues), il(n.children, c))];
    case 'delete': return [P.Span(P.attr(n.attrs?.id, ['carve-delete', ...(n.attrs?.classes ?? [])], n.attrs?.keyValues), il(n.children, c))];
    case 'insert': return [P.Span(P.attr(n.attrs?.id, ['carve-insert', ...(n.attrs?.classes ?? [])], n.attrs?.keyValues), il(n.children, c))];
    case 'code': return [P.Code(attr(n.attrs), stripBidi(n.value))];
    case 'literal_inline': return [P.Span(P.attr(n.attrs?.id, ['carve-literal', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ['value', JSON.stringify(stripBidi(n.value))]]), literalInlines(n.value))];
    case 'math': return [inlineAttr(n, n.display ? P.MathDisplay(stripBidi(n.value)) : P.MathInline(stripBidi(n.value)))];
    case 'raw_inline': return [P.RawInline(n.format, n.value)];
    case 'smart_punctuation': return [P.Span(P.attr('', ['carve-smart'], [['kind', n.kind], ['source', n.source], ...(n.glyph ? [['glyph', n.glyph] as [string, string]] : [])]), words(n.glyph ?? n.source))];
    case 'link': { const target = n.href ?? (n.key ? c.links.get(n.key)?.[0] : undefined); if (target === undefined) c.warnings.push('link: unresolved reference'); return [P.Link(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.key ? [['carve-key', n.key], ['carve-form', n.refForm ?? 'full']] as [string, string][] : []), ...(n.href === undefined ? [['carve-unresolved', '1'] as [string, string]] : [])]), il(n.children, c), [safeTarget(target ?? '', c), n.tooltip ?? ''])]; }
    case 'image': { const target = n.src ?? (n.key ? c.links.get(n.key)?.[0] : undefined); if (target === undefined) c.warnings.push('image: unresolved reference'); return [P.Image(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.key ? [['carve-key', n.key], ['carve-form', n.refForm ?? 'full']] as [string, string][] : []), ...(n.longDescription ? [['carve-long-description', JSON.stringify(n.longDescription)] as [string, string]] : []), ...(n.src === undefined ? [['carve-unresolved', '1'] as [string, string]] : [])]), words(n.alt ?? ''), [safeTarget(target ?? '', c), n.tooltip ?? ''])]; }
    case 'autolink': return [P.Link(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ['carve-autolink', '1']]), words(n.text ?? n.href), [safeTarget(n.href, c), ''])];
    case 'xref': { const label = c.targets.get(n.key); if (!label) c.warnings.push(`xref: unresolved target ${n.key}`); return [P.Link(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ['carve-xref', '1'], ['carve-key', n.key], ['carve-namespace', n.namespace], ...(n.display ? [['carve-display-form', n.display] as [string, string]] : [])]), label ?? words(n.key), [n.href ?? `#${n.key}`, ''])]; }
    case 'footnote_ref': { const note = P.Note(bl(c.notes.get(n.key) ?? [], c)); c.noteCount++; return [P.Span(P.attr(n.attrs?.id, ['carve-footnote-ref', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ['key', n.key]]), [note])]; }
    case 'inline_footnote': { const note = P.Note([P.Para(il(n.children, c))]); c.noteCount++; return [inlineAttr(n, note)]; }
    case 'abbreviation': return [P.Span(P.attr('', ['carve-abbreviation'], [['key', n.key], ['expansion', n.expansion ?? '']]), words(n.key))];
    case 'mention': return [P.Span(P.attr('', ['carve-mention'], [['target', n.target], ['kind', n.kind]]), words(n.label ?? `@${n.target}`))];
    case 'tag': return [P.Span(P.attr('', ['carve-tag'], [['name', n.name]]), words(`#${n.name}`))];
    case 'symbol': c.warnings.push('symbol: no Pandoc equivalent'); return [P.Span(P.attr(n.attrs?.id, ['carve-symbol', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ['name', n.name]]), words(`:${n.name}:`))];
    case 'ruby_pair': return [...il(n.base, c), ...il(n.annotation, c)];
    case 'ruby': c.warnings.push('ruby: no Pandoc equivalent'); return [P.Span(P.attr(n.attrs?.id, ['carve-ruby', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ['carve-pairs', JSON.stringify(n.pairs, (key, value) => key === 'pos' || key === 'segments' ? undefined : value)]]), n.pairs.flatMap(p => words(`${p.base.map(x => x.type === 'text' ? x.value : '').join('')}(${p.annotation.map(x => x.type === 'text' ? x.value : '').join('')})`)))];
    case 'citation_group': return [P.Cite(n.children.map(x => {
      const label = x.locator?.label;
      if (label) c.warnings.push(`citation @${x.key}: typed locator (${label}) is flattened into the Pandoc suffix`);
      const shortLabel = label === 'page' ? 'p.' : label === 'pages' ? 'pp.' : label === 'chapter' ? 'chap.' : label;
      const locator = x.locator ? [P.Str(','), P.Space, ...(shortLabel ? words(`${shortLabel} `) : []), ...il(x.locator.children, c)] : [];
      return P.citation(x.key, x.mode === 'suppress-author' ? 'SuppressAuthor' : x.mode === 'author-in-text' ? 'AuthorInText' : 'NormalCitation', il(x.prefix ?? [], c), [...locator, ...il(x.suffix ?? [], c)], c.noteCount + 1);
    }), words(n.raw))];
    case 'inline_extension': c.warnings.push(`inline_extension: ${n.name} uses fallback`); return [P.Span(P.attr('', ['carve-extension'], [['name', n.name]]), il(n.fallback ?? n.children, c))];
    case 'critic_comment': return [P.RawInline('carve-critic-comment', n.value)];
    case 'comment': return n.form === 'braced' ? [P.RawInline('carve-comment', n.value)] : [P.RawBlock(`carve-comment-${n.form}`, n.value)];
    case 'caption_number': return words(String(n.n ?? '#'));
    case 'paragraph': { const para = P.Para(il(n.children, c)); return n.attrs || n.role ? [P.Div(P.attr(n.attrs?.id, ['carve-paragraph', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(n.role === 'image' ? [['carve-block-image', '1'] as [string, string]] : []), ...(n.role === 'math' ? [['carve-block-math', '1'] as [string, string]] : [])]), [para])] : [para]; }
    case 'heading': return [P.Header(n.level, P.attr(n.attrs?.id ?? n.generatedId, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.generatedId && !n.attrs?.id ? [['carve-generated-id', '1'] as [string, string]] : [])]), il(n.children, c))];
    case 'thematic_break': return [P.HorizontalRule];
    case 'block_quote': return n.attrs ? [P.Div(P.attr(n.attrs.id, ['carve-block-quote', ...(n.attrs.classes ?? [])], n.attrs.keyValues), [P.BlockQuote(bl(n.children, c))])] : [P.BlockQuote(bl(n.children, c))];
    case 'code_block': return [P.CodeBlock(P.attr(n.attrs?.id, [...(n.syntax ? [n.syntax] : []), ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(n.groupLabel ? [['carve-group-label', n.groupLabel] as [string, string]] : []), ...titleCarrier(n.title)]), stripBidi(n.value))];
    case 'raw_block': return [P.RawBlock(n.format, n.value)];
    case 'div': return [P.Div(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.groupLabel !== undefined ? [['carve-group-label', n.groupLabel] as [string, string]] : []), ...titleCarrier(n.title)]), [...openingBlocks(n.title, n.groupLabel, c), ...bl(n.children, c)])];
    case 'section': return [P.Div(P.attr(n.attrs?.id, ['carve-section', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(n.level ? [['carve-section-level', String(n.level)] as [string, string]] : [])]), bl(n.children, c))];
    case 'admonition': return [P.Div(P.attr(n.attrs?.id, ['carve-admonition', n.kind, ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(n.groupLabel !== undefined ? [['carve-group-label', n.groupLabel] as [string, string]] : []), ...titleCarrier(n.title)]), [...openingBlocks(n.title, n.groupLabel, c), ...bl(n.children, c)])];
    case 'directive': return [P.Div(P.attr(n.attrs?.id, ['carve-directive', n.kind, ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(n.groupLabel !== undefined ? [['carve-group-label', n.groupLabel] as [string, string]] : []), ...titleCarrier(n.title)]), [...openingBlocks(n.title, n.groupLabel, c), ...bl(n.children, c)])];
    case 'block_extension': c.warnings.push(`block_extension: ${n.name} uses fallback`); return [P.Div(P.attr('', ['carve-extension'], [['name', n.name]]), bl(n.fallback, c))];
    case 'include': c.warnings.push('include: unresolved'); return [P.Div(P.attr('', ['carve-include'], [['path', n.path], ...(n.section ? [['section', n.section] as [string, string]] : []), ...(n.options ? [['options', JSON.stringify(n.options)] as [string, string]] : [])]), [])];
    case 'figure': return [P.Figure(P.attr(n.attrs?.id, n.attrs?.classes, [...(n.attrs?.keyValues ?? []), ...(n.kind ? [['carve-figure-kind', n.kind] as [string, string]] : []), ...captionCarrier(n.caption)]), cap(n.caption, c), bl(n.children, c), n.caption?.short ? il(n.caption.short, c) : null)];
    case 'figure_group': return [P.Figure(P.attr(n.attrs?.id, ['carve-figure-group', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...captionCarrier(n.caption)]), cap(n.caption, c), bl(n.children, c), n.caption?.short ? il(n.caption.short, c) : null)];
    case 'line_block': return [P.LineBlock(n.children.map(x => {
      const [first, ...rest] = x.children;
      if (first?.type !== 'text') return il(x.children, c);
      const indent = first.value.match(/^ */u)?.[0].length ?? 0;
      return indent ? [P.Str('\u00a0'.repeat(indent) + stripBidi(first.value.slice(indent))), ...il(rest, c)] : il(x.children, c);
    }))];
    case 'list': {
      const items = n.children.map(item => {
        const content = bl(item.children, c).map(block => n.spacing === 'tight' && block.t === 'Para' ? P.Plain(block.c as P.Inline[]) : block);
        const marker = item.task
          ? P.Span(P.attr(item.attrs?.id, ['carve-task', ...(item.attrs?.classes ?? [])], [...(item.attrs?.keyValues ?? []), ['mark', item.task.mark]]), [])
          : item.attrs ? P.Span(P.attr(item.attrs.id, ['carve-list-item', ...(item.attrs.classes ?? [])], item.attrs.keyValues), []) : null;
        if (marker) {
          const prefix: P.Inline[] = item.task ? [P.Str(item.task.mark === 'x' ? '☒' : '☐'), P.Space, marker] : [marker];
          if (content[0]?.t === 'Para' || content[0]?.t === 'Plain') content[0] = { ...content[0], c: [...prefix, ...content[0].c as P.Inline[]] };
          else content.unshift(P.Plain(prefix));
        }
        return content;
      });
      const list = n.marker.kind === 'bullet' ? P.BulletList(items) : P.OrderedList(n.marker.start ?? 1, n.marker.style === 'a' ? 'LowerAlpha' : n.marker.style === 'A' ? 'UpperAlpha' : n.marker.style === 'i' ? 'LowerRoman' : n.marker.style === 'I' ? 'UpperRoman' : n.attrs?.keyValues?.some(([key, value]) => key === 'carve-example' && value === '1') ? 'Example' : 'Decimal', items, n.attrs?.keyValues?.find(([key]) => key === 'carve-example-delimiter')?.[1] as P.ListNumberDelim ?? (n.marker.delimiter === ')' ? 'OneParen' : 'Period'));
      const alternateBullet = n.marker.kind === 'bullet' && n.marker.char !== '-';
      const carriedAttrs = Boolean(n.attrs?.id || n.attrs?.classes?.length || n.attrs?.keyValues?.some(([key]) => key !== 'carve-example' && key !== 'carve-example-delimiter'));
      return carriedAttrs || alternateBullet ? [P.Div(P.attr(n.attrs?.id, ['carve-list', ...(n.attrs?.classes ?? [])], [...(n.attrs?.keyValues ?? []), ...(alternateBullet ? [['marker-char', n.marker.char ?? '-'] as [string, string]] : [])]), [list])] : [list];
    }
    case 'definition_list': { const entries: [P.Inline[], P.Block[][]][] = []; for (const x of n.children) { if (x.type === 'definition_term') entries.push([il(x.children, c), []]); if (x.type === 'definition_description' && entries.length) entries[entries.length - 1]![1].push(bl(x.children, c)); } return [P.DefinitionList(entries)]; }
    case 'table': return [table(n, c)];
    case 'frontmatter': return [P.RawBlock(`carve-frontmatter:${n.format}`, n.value)];
    case 'footnote': case 'link_reference_definition': case 'abbreviation_def': case 'citation_definition': c.warnings.push(`${n.type}: carried as raw Pandoc JSON block`); return [P.RawBlock('carve-tree', JSON.stringify(n, (key, value) => key === 'pos' || key === 'segments' ? undefined : value))];
    case 'caption': return bl(n.children, c);
    case 'cell_paragraph': return [P.Plain(il(n.children, c))];
    case 'citation': return words(n.key);
    case 'definition_term': return il(n.children, c);
    case 'definition_description': return bl(n.children, c);
    case 'line': return il(n.children, c);
    case 'list_item': return bl(n.children, c);
    case 'table_head': case 'table_body': case 'table_foot': return n.children.flatMap(x => emit(x, c));
    case 'table_row': return n.children.flatMap(x => emit(x, c));
    case 'table_cell': return n.children.flatMap(x => emit(x, c));
    case 'table_column': return [];
    default: return impossible(n);
  }
}
export function carveAstToPandoc(input: DocumentNode | string): Result {
  const ast: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  validateTree(ast);
  const c: Context = { warnings: [], notes: new Map(), links: new Map(), targets: new Map(), noteCount: 0 };
  for (const x of ast.children) { if (x.type === 'footnote') c.notes.set(x.key, x.children); if (x.type === 'link_reference_definition') c.links.set(x.key, [x.href, x.tooltip ?? '']); }
  for (const x of ast.children) {
    if (x.type === 'heading') { const id = x.attrs?.id ?? x.generatedId; if (id) { const label = il(x.children.filter(node => node.type !== 'xref' || node.key !== id), c); while (label.at(-1)?.t === 'Space') label.pop(); c.targets.set(id, label); } }
    if ((x.type === 'figure' || x.type === 'table') && x.attrs?.id) {
      const caption = x.caption?.children.flatMap(block => block.type === 'paragraph' ? block.children : []) ?? [];
      const index = caption.findIndex(node => node.type === 'caption_number');
      const number = caption[index];
      const prefix = captionText(caption.slice(0, index < 0 ? 0 : index)).trim();
      c.targets.set(x.attrs.id, number?.type === 'caption_number' ? words(`${prefix} ${number.n ?? '#'}`.trim()) : words(x.attrs.id));
    }
    if (x.type === 'figure_group' && x.attrs?.id) {
      const caption = x.caption?.children.flatMap(block => block.type === 'paragraph' ? block.children : []) ?? [];
      const number = caption.find(node => node.type === 'caption_number');
      const numberText = number?.type === 'caption_number' ? String(number.n ?? '#') : '';
      const prefix = captionText(caption.slice(0, caption.indexOf(number!))).trim() || 'Figure';
      const label = numberText ? `${prefix} ${numberText}` : x.attrs.id;
      c.targets.set(x.attrs.id, words(label));
      x.children.forEach((panel, index) => {
        if ((panel.type === 'figure' || panel.type === 'table') && panel.attrs?.id && numberText) c.targets.set(panel.attrs.id, words(`${label}${String.fromCharCode(97 + index)}`));
      });
    }
  }
  const metadata = ast.metadata;
  const meta: P.PandocDoc['meta'] = {};
  if (metadata?.title) meta.title = { t: 'MetaInlines', c: il(metadata.title, c) };
  if (metadata?.subtitle) meta.subtitle = { t: 'MetaInlines', c: il(metadata.subtitle, c) };
  if (metadata?.authors) meta.author = { t: 'MetaList', c: metadata.authors.map(author => ({ t: 'MetaInlines', c: words(author) })) };
  if (metadata?.date) meta.date = { t: 'MetaString', c: metadata.date };
  if (metadata?.bibliography) meta['carve-bibliography'] = { t: 'MetaString', c: JSON.stringify(metadata.bibliography) };
  return { doc: { 'pandoc-api-version': [...P.PANDOC_API_VERSION], meta, blocks: emit(ast, c) }, warnings: c.warnings };
}
export const carveToCarveAst = (source: string): DocumentNode => parse(source);
export const carveToPandoc = (source: string): Result => carveAstToPandoc(parse(source));
export const carveToPandocJson = (source: string): string => JSON.stringify(carveToPandoc(source).doc);

const importAttr = (a: unknown): Attrs | undefined => {
  if (!Array.isArray(a)) return undefined;
  const [id, classes, keyValues] = a as P.Attr;
  return id || classes.length || keyValues.length ? { ...(id ? { id } : {}), ...(classes.length ? { classes } : {}), ...(keyValues.length ? { keyValues } : {}) } : undefined;
};
const readTitle = (value: string | undefined): Inline[] | undefined => { if (value === undefined) return undefined; try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed as Inline[] : undefined; } catch { return undefined; } };
const readCaption = (value: string | undefined): CaptionNode | undefined => { if (value === undefined) return undefined; try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'caption' ? parsed as CaptionNode : undefined; } catch { return undefined; } };
const withAttr = <T extends Node>(node: T, a: unknown): T => { const attrs = importAttr(a); return attrs ? { ...node, attrs } : node; };
const inlineList = (xs: P.PandocNode[], warnings: string[]): Inline[] => xs.flatMap(x => importInline(x, warnings));
const blockList = (xs: P.PandocNode[], warnings: string[]): Block[] => xs.flatMap(x => importBlock(x, warnings));
function importItem(item: P.PandocNode[], warnings: string[]): Extract<Node, { type: 'list_item' }> {
  const copy = item.map(node => ({ ...node }));
  const first = copy[0];
  let mark: ' ' | 'x' | '_' | '-' | '/' | '!' | '>' | '?' | undefined;
  let attrs: Attrs | undefined;
  if ((first?.t === 'Para' || first?.t === 'Plain') && Array.isArray(first.c)) {
    const inlines = first.c as P.PandocNode[];
    const ballot = inlines[0]?.t === 'Str' && (inlines[0].c === '☒' || inlines[0].c === '☐') && (inlines[1]?.t === 'Space' || inlines.length === 1);
    const markerIndex = ballot ? (inlines[1]?.t === 'Space' ? 2 : 1) : 0;
    const head = inlines[markerIndex];
    if (head?.t === 'Span') {
      const a = (head.c as [P.Attr, unknown])[0];
      if (a[1].includes('carve-task') || a[1].includes('carve-list-item')) {
        const fields = Object.fromEntries(a[2]);
        const candidate = fields['mark'];
        if (a[1].includes('carve-task') && [' ', 'x', '_', '-', '/', '!', '>', '?'].includes(candidate ?? '')) mark = candidate as typeof mark;
        attrs = importAttr([a[0], a[1].filter(name => name !== 'carve-task' && name !== 'carve-list-item'), a[2].filter(([key]) => key !== 'mark')]);
        first.c = inlines.slice(markerIndex + 1);
      }
    }
    if (mark === undefined && ballot) { mark = inlines[0]!.c === '☒' ? 'x' : ' '; first.c = inlines.slice(markerIndex); }
    if (Array.isArray(first.c) && first.c.length === 0) copy.shift();
  }
  return { type: 'list_item', children: blockList(copy, warnings), ...(mark === undefined ? {} : { task: { mark } }), ...(attrs ? { attrs } : {}) };
}

function importInline(node: P.PandocNode, warnings: string[]): Inline[] {
  const c = node.c as any;
  switch (node.t) {
    case 'Str': return [{ type: 'text', value: String(c) }];
    case 'Space': return [{ type: 'text', value: ' ' }];
    case 'SoftBreak': return [{ type: 'soft_break' }];
    case 'LineBreak': return [{ type: 'hard_break' }];
    case 'Emph': return [{ type: 'emphasis', children: inlineList(c, warnings) }];
    case 'Strong': return [{ type: 'strong', children: inlineList(c, warnings) }];
    case 'Underline': return [{ type: 'underline', children: inlineList(c, warnings) }];
    case 'Strikeout': return [{ type: 'strike', children: inlineList(c, warnings) }];
    case 'Superscript': return [{ type: 'superscript', children: inlineList(c, warnings) }];
    case 'Subscript': return [{ type: 'subscript', children: inlineList(c, warnings) }];
    case 'SmallCaps': return [{ type: 'small_caps', children: inlineList(c, warnings) }];
    case 'Code': { const a = c[0] as P.Attr; return a[1].includes('carve-literal') ? [{ type: 'literal_inline', value: c[1] }] : [withAttr({ type: 'code', value: c[1] }, a)]; }
    case 'Math': return [{ type: 'math', display: c[0].t === 'DisplayMath', value: c[1] }];
    case 'RawInline': return c[0] === 'carve-comment' ? [{ type: 'comment', form: 'braced', value: c[1] }] : c[0].startsWith('carve-comment-') ? [{ type: 'comment', form: c[0].slice('carve-comment-'.length) as 'line', value: c[1] }] : c[0] === 'carve-critic-comment' ? [{ type: 'critic_comment', value: c[1] }] : [{ type: 'raw_inline', format: c[0], value: c[1] }];
    case 'Link': { const a = c[0] as P.Attr; const f = Object.fromEntries(a[2]); const clean: P.Attr = [a[0], a[1], a[2].filter(([k]) => !['carve-key','carve-form','carve-unresolved','carve-autolink','carve-xref','carve-namespace','carve-display-form'].includes(k))]; if (f['carve-autolink']) return [withAttr({ type: 'autolink', href: c[2][0] }, clean)]; if (f['carve-xref']) return [withAttr({ type: 'xref', key: f['carve-key'] ?? '', namespace: (f['carve-namespace'] ?? 'heading') as 'heading', ...(f['carve-display-form'] ? { display: f['carve-display-form'] as 'full' } : {}), ...(!f['carve-unresolved'] ? { href: c[2][0] } : {}) }, clean)]; return [withAttr({ type: 'link', children: inlineList(c[1], warnings), ...(f['carve-unresolved'] ? {} : { href: c[2][0] }), ...(c[2][1] ? { tooltip: c[2][1] } : {}), ...(f['carve-key'] ? { key: f['carve-key'], namespace: 'link', refForm: f['carve-form'] === 'collapsed' ? 'collapsed' as const : 'full' as const } : {}) }, clean)]; }
    case 'Image': { const a = c[0] as P.Attr; const f = Object.fromEntries(a[2]); const clean: P.Attr = [a[0], a[1], a[2].filter(([k]) => !['carve-key','carve-form','carve-unresolved','carve-long-description'].includes(k))]; let longDescription: Block[] | undefined; try { if (f['carve-long-description']) longDescription = JSON.parse(f['carve-long-description']); } catch { warnings.push('Image: invalid long description carrier'); } return [withAttr({ type: 'image', ...(f['carve-unresolved'] ? {} : { src: c[2][0] }), alt: c[1].map((x: P.PandocNode) => x.t === 'Str' ? String(x.c) : x.t === 'Space' ? ' ' : '').join(''), ...(longDescription ? { longDescription } : {}), ...(c[2][1] ? { tooltip: c[2][1] } : {}), ...(f['carve-key'] ? { key: f['carve-key'], namespace: 'link', refForm: f['carve-form'] === 'collapsed' ? 'collapsed' as const : 'full' as const } : {}) }, clean)]; }
    case 'Span': { const a = c[0] as P.Attr; const children = inlineList(c[1], warnings); const fields = Object.fromEntries(a[2]); if (a[1].includes('carve-literal')) { const clean: P.Attr = [a[0], a[1].filter(x => x !== 'carve-literal'), a[2].filter(([k]) => k !== 'value')]; try { return [withAttr({ type: 'literal_inline', value: JSON.parse(fields['value'] ?? '""') }, clean)]; } catch { warnings.push('Literal: invalid value carrier'); return [withAttr({ type: 'literal_inline', value: '' }, clean)]; } } if (a[1].includes('carve-ruby')) { try { const pairs = JSON.parse(fields['carve-pairs'] ?? '[]') as Extract<Inline, {type: 'ruby'}>['pairs']; return [withAttr({ type: 'ruby', pairs }, [a[0], a[1].filter(x => x !== 'carve-ruby'), a[2].filter(([key]) => key !== 'carve-pairs')])]; } catch { warnings.push('Ruby: invalid pairs carrier'); } } if (a[1].includes('carve-footnote-ref')) return [withAttr({ type: 'footnote_ref', namespace: 'footnote', key: fields['key'] ?? '' }, [a[0], a[1].filter(x => x !== 'carve-footnote-ref'), a[2].filter(([key]) => key !== 'key')])]; if (a[1].includes('carve-smart')) return [{ type: 'smart_punctuation', kind: (fields['kind'] ?? 'em_dash') as Extract<Inline, {type: 'smart_punctuation'}>['kind'], source: fields['source'] ?? '', ...(fields['glyph'] ? { glyph: fields['glyph'] } : {}) }]; if (a[1].includes('carve-delete')) return [withAttr({ type: 'delete', children }, [a[0], a[1].filter(x => x !== 'carve-delete'), a[2]])]; if (a[1].includes('carve-insert')) return [withAttr({ type: 'insert', children }, [a[0], a[1].filter(x => x !== 'carve-insert'), a[2]])]; if (a[1].includes('carve-mention')) return [{ type: 'mention', target: fields['target'] ?? '', kind: fields['kind'] ?? 'user' }]; if (a[1].includes('carve-tag')) return [{ type: 'tag', name: fields['name'] ?? '' }]; if (a[1].includes('carve-symbol')) return [withAttr({ type: 'symbol', name: fields['name'] ?? '' }, [a[0], a[1].filter(x => x !== 'carve-symbol'), a[2].filter(([key]) => key !== 'name')])]; if (a[1].includes('carve-abbreviation')) return [{ type: 'abbreviation', namespace: 'abbr', key: fields['key'] ?? '', ...(fields['expansion'] ? { expansion: fields['expansion'] } : {}) }]; if (a[1].includes('carve-inline-attrs') && children.length === 1 && children[0]?.type === fields['carve-inline-type']) return [withAttr(children[0]!, [a[0], a[1].filter(x => x !== 'carve-inline-attrs'), a[2].filter(([k]) => k !== 'carve-inline-type')]) as Inline]; return a[1].includes('mark') ? [withAttr({ type: 'highlight', children }, [a[0], a[1].filter(x => x !== 'mark'), a[2]])]: [withAttr({ type: 'span', children }, a)]; }
    case 'Note': { const children = blockList(c, warnings).flatMap(x => x.type === 'paragraph' ? x.children : []); if (children.length === 0) warnings.push('Note: block content cannot be represented by inline_footnote'); return [{ type: 'inline_footnote', children }]; }
    case 'Quoted': return [{ type: 'smart_punctuation', kind: c[0].t === 'SingleQuote' ? 'left_single_quote' : 'left_double_quote', glyph: c[0].t === 'SingleQuote' ? '‘' : '“', source: c[0].t === 'SingleQuote' ? "'" : '"' }, ...inlineList(c[1], warnings), { type: 'smart_punctuation', kind: c[0].t === 'SingleQuote' ? 'right_single_quote' : 'right_double_quote', glyph: c[0].t === 'SingleQuote' ? '’' : '”', source: c[0].t === 'SingleQuote' ? "'" : '"' }];
    case 'Cite': {
      const records = c[0] as P.Citation[];
      const display = (nodes: P.PandocNode[]): string => nodes.map(node => node.t === 'Str' ? String(node.c) : node.t === 'Space' || node.t === 'SoftBreak' ? ' ' : Array.isArray(node.c) ? display(node.c as P.PandocNode[]) : '').join('');
      const source = display(c[1] as P.PandocNode[]);
      const children = records.map(record => {
        const suffixText = display(record.citationSuffix ?? []);
        const locatorMatch = /^,\s*(p\.|pp\.|chap\.)\s+(.+)$/u.exec(suffixText);
        const label = locatorMatch?.[1] === 'p.' ? 'page' : locatorMatch?.[1] === 'pp.' ? 'pages' : locatorMatch?.[1] === 'chap.' ? 'chapter' : undefined;
        const integralPrefix = record.citationMode.t === 'NormalCitation' && display(record.citationPrefix ?? []) === '+' && source.includes(`+@${record.citationId}`);
        return { type: 'citation' as const, key: record.citationId, namespace: 'citation' as const,
          ...(record.citationMode.t === 'NormalCitation' && !integralPrefix ? {} : { mode: record.citationMode.t === 'SuppressAuthor' ? 'suppress-author' as const : 'author-in-text' as const }),
          ...(record.citationPrefix?.length && !integralPrefix ? { prefix: inlineList(record.citationPrefix, warnings) } : {}),
          ...(locatorMatch ? { locator: { ...(label ? { label } : {}), children: [{ type: 'text' as const, value: locatorMatch[2]! }] } } : record.citationSuffix?.length ? { suffix: inlineList(record.citationSuffix, warnings) } : {}),
        };
      });
      const keys = [...source.matchAll(/(?<!\\)@([\w:-]+)/gu)].map(match => match[1]);
      const sourceMatches = source.startsWith('[') && source.endsWith(']') && keys.length === records.length && keys.every((key, index) => key === records[index]?.citationId);
      const raw = sourceMatches ? source : `[${records.map(record => {
        const prefix = display(record.citationPrefix ?? []);
        const marker = record.citationMode.t === 'AuthorInText' ? '+@' : record.citationMode.t === 'SuppressAuthor' ? '-@' : '@';
        const suffix = display(record.citationSuffix ?? []);
        return `${prefix ? `${prefix} ` : ''}${marker}${record.citationId}${suffix}`;
      }).join('; ')}]`;
      return [{ type: 'citation_group', raw, children }];
    }
    default: warnings.push(`${node.t}: unsupported Pandoc inline`); return [{ type: 'text', value: String(node.c ?? '') }];
  }
}

function importTable(c: any[], warnings: string[]): TableNode {
  const row = (r: any[], header: boolean): TableRowNode => {
    const rowAttr = r[0] as P.Attr;
    const cells: TableCellNode[] = r[1].map((cell: any[]) => {
    const content = blockList(cell[4], warnings);
    const children: TableCellNode['children'] = content.length === 1 && content[0]?.type === 'paragraph' ? [{ type: 'cell_paragraph', children: content[0].children }] : content;
    const cellFields = Object.fromEntries((cell[0] as P.Attr)[2]);
    const span = cellFields['carve-span'];
    let headerIds: string[] | undefined;
    try { if (cellFields['carve-header-ids']) headerIds = JSON.parse(cellFields['carve-header-ids']); }
    catch { warnings.push('Table: invalid header IDs carrier'); }
    const scope = cellFields['carve-scope'];
    return withAttr({ type: 'table_cell', header: header || cellFields['carve-header'] === '1', ...(span === 'rowspan' || span === 'colspan' ? { span } : {}), ...(scope === 'row' || scope === 'col' || scope === 'rowgroup' || scope === 'colgroup' ? { scope } : {}), ...(headerIds ? { headerIds } : {}), ...(cell[1].t === 'AlignDefault' ? {} : { align: cell[1].t === 'AlignLeft' ? 'left' as const : cell[1].t === 'AlignRight' ? 'right' as const : 'center' as const }), ...(cell[2] > 1 ? { rowspan: cell[2] } : {}), ...(cell[3] > 1 ? { colspan: cell[3] } : {}), children }, [(cell[0] as P.Attr)[0], (cell[0] as P.Attr)[1], (cell[0] as P.Attr)[2].filter(([k]) => !['carve-span', 'carve-scope', 'carve-header-ids', 'carve-header'].includes(k))]);
    });
    const saved = rowAttr[2].find(([key]) => key === 'carve-covered-cells')?.[1];
    if (saved) {
      try {
        const covered = JSON.parse(saved) as { index: number; cell: TableCellNode }[];
        for (const item of covered) cells.splice(item.index, 0, item.cell);
      } catch { warnings.push('Table: invalid covered cell carrier'); }
    }
    return withAttr({ type: 'table_row', children: cells }, [rowAttr[0], rowAttr[1], rowAttr[2].filter(([key]) => key !== 'carve-covered-cells')]);
  };
  const children: TableNode['children'] = [];
  if (c[3][1].length || importAttr(c[3][0])) children.push(withAttr({ type: 'table_head', children: c[3][1].map((r: any[]) => row(r, true)) }, c[3][0]));
  for (const b of c[4]) { const headZero = (b[0] as P.Attr)[2].some(([k]) => k === 'carve-head-rows'); children.push(withAttr({ type: 'table_body', ...(headZero || b[2].length ? { headRows: b[2].length } : {}), ...(b[1] ? { rowHeadColumns: b[1] } : {}), children: [...b[2].map((r: any[]) => row(r, true)), ...b[3].map((r: any[]) => row(r, false))] }, [(b[0] as P.Attr)[0], (b[0] as P.Attr)[1], (b[0] as P.Attr)[2].filter(([k]) => k !== 'carve-head-rows')])); }
  if (c[5][1].length || importAttr(c[5][0])) children.push(withAttr({ type: 'table_foot', children: c[5][1].map((r: any[]) => row(r, false)) }, c[5][0]));
  let columns: TableNode['columns'] = c[2].map((x: any[]) => ({ type: 'table_column', ...(x[0].t === 'AlignDefault' ? {} : { align: x[0].t === 'AlignLeft' ? 'left' as const : x[0].t === 'AlignRight' ? 'right' as const : 'center' as const, authored: true as const }), ...(x[1].t === 'ColWidth' ? { width: x[1].c, authored: true as const } : {}) }));
  const columnFacts = (c[0] as P.Attr)[2].find(([k]) => k === 'carve-columns')?.[1];
  if (columnFacts) { try { const saved = JSON.parse(columnFacts) as Omit<TableNode['columns'][number], 'type'>[]; if (Array.isArray(saved) && saved.length === columns.length) columns = saved.map(x => ({ type: 'table_column', ...x })); } catch { warnings.push('Table: invalid carve-columns carrier'); } }
  const caption: CaptionNode | undefined = c[1][1].length ? { type: 'caption', children: blockList(c[1][1], warnings), ...(c[1][0] ? { short: inlineList(c[1][0], warnings) } : {}) } : undefined;
  // Source control keys describe rows; a stale Pandoc Attr must not override them.
  const partitionKeys = new Set(['header-rows', 'footer-rows']);
  return withAttr({ type: 'table', columns, children, ...(caption ? { caption } : {}) }, [(c[0] as P.Attr)[0], (c[0] as P.Attr)[1], (c[0] as P.Attr)[2].filter(([k]) => k !== 'carve-columns' && !partitionKeys.has(k))]);
}

function importBlock(node: P.PandocNode, warnings: string[]): Block[] {
  const c = node.c as any;
  switch (node.t) {
    case 'Para': case 'Plain': return [{ type: 'paragraph', children: inlineList(c, warnings) }];
    case 'Header': { const a = c[1] as P.Attr; const generated = a[2].some(([key]) => key === 'carve-generated-id'); const cleaned: P.Attr = [generated ? '' : a[0], a[1], a[2].filter(([key]) => key !== 'carve-generated-id')]; return [withAttr({ type: 'heading', level: c[0], children: inlineList(c[2], warnings) }, cleaned)]; }
    case 'HorizontalRule': return [{ type: 'thematic_break' }];
    case 'BlockQuote': return [{ type: 'block_quote', children: blockList(c, warnings) }];
    case 'CodeBlock': { const a = c[0] as P.Attr; const groupLabel = a[2].find(([key]) => key === 'carve-group-label')?.[1]; const title = readTitle(a[2].find(([key]) => key === 'carve-title')?.[1]); return [withAttr({ type: 'code_block', value: c[1], ...(a[1][0] ? { syntax: a[1][0] } : {}), ...(groupLabel ? { groupLabel } : {}), ...(title ? { title } : {}) }, [a[0], a[1].slice(1), a[2].filter(([key]) => key !== 'carve-group-label' && key !== 'carve-title')])]; }
    case 'RawBlock': return c[0] === 'carve-tree' ? [JSON.parse(c[1]) as Block] : c[0].startsWith('carve-frontmatter:') ? [{ type: 'frontmatter', format: c[0].slice('carve-frontmatter:'.length), value: c[1] } as unknown as Block] : c[0].startsWith('carve-comment-') ? [{ type: 'comment', form: c[0].slice('carve-comment-'.length), value: c[1] }] : [{ type: 'raw_block', format: c[0], value: c[1] }];
    case 'Div': { const a = c[0] as P.Attr; const kvs = Object.fromEntries(a[2]); const title = readTitle(kvs['carve-title']); if (a[1].includes('carve-include')) { let options: Extract<Block, {type: 'include'}>['options']; try { if (kvs['options']) options = JSON.parse(kvs['options']); } catch { warnings.push('Include: invalid options carrier'); } return [{ type: 'include', path: kvs['path'] ?? '', ...(kvs['section'] ? { section: kvs['section'] } : {}), ...(options ? { options } : {}) }]; } if (a[1].includes('carve-block-quote') && c[1].length === 1 && c[1][0].t === 'BlockQuote') { const quote = importBlock(c[1][0], warnings)[0]; return [withAttr(quote!, [a[0], a[1].filter(x => x !== 'carve-block-quote'), a[2]]) as Block]; } if (a[1].includes('carve-figure-group')) { const caption = readCaption(kvs['carve-caption']); return [withAttr({ type: 'figure_group', children: blockList(c[1], warnings), ...(caption ? { caption } : {}) }, [a[0], a[1].filter(x => x !== 'carve-figure-group'), a[2].filter(([key]) => key !== 'carve-caption')])]; } if (a[1].includes('carve-list') && c[1].length === 1) { const list = importBlock(c[1][0], warnings)[0]; if (list?.type === 'list') { const restored = list.marker.kind === 'bullet' && kvs['marker-char'] === '*' ? { ...list, marker: { kind: 'bullet' as const, char: '*' as const } } : list; return [withAttr(restored, [a[0], a[1].filter(x => x !== 'carve-list'), a[2].filter(([key]) => key !== 'marker-char')])]; } } if (a[1].includes('carve-paragraph') && c[1].length === 1 && c[1][0].t === 'Para') { const cleaned: P.Attr = [a[0], a[1].filter(x => x !== 'carve-paragraph'), a[2].filter(([key]) => !['carve-block-image','carve-block-math'].includes(key))]; return [withAttr({ type: 'paragraph', children: inlineList(c[1][0].c, warnings), ...(kvs['carve-block-image'] ? { role: 'image' as const } : {}), ...(kvs['carve-block-math'] ? { role: 'math' as const } : {}) }, cleaned)]; } const cleaned: P.Attr = [a[0], a[1].filter(x => !['carve-section', 'carve-admonition', 'carve-directive'].includes(x)), a[2].filter(([key]) => !['carve-group-label', 'carve-section-level', 'carve-title'].includes(key))]; const presentationCount = (kvs['carve-title'] !== undefined ? 1 : 0) + (kvs['carve-group-label'] !== undefined ? 1 : 0); const children = blockList(c[1].slice(presentationCount), warnings); if (a[1].includes('carve-section')) return [withAttr({ type: 'section', children, ...(kvs['carve-section-level'] ? { level: Number(kvs['carve-section-level']) } : {}) }, cleaned)]; if (a[1].includes('carve-admonition')) return [withAttr({ type: 'admonition', kind: a[1][a[1].indexOf('carve-admonition') + 1] as 'note', children, ...(kvs['carve-group-label'] !== undefined ? { groupLabel: kvs['carve-group-label'] } : {}), ...(title ? { title } : {}) }, [cleaned[0], cleaned[1].filter(x => x !== a[1][a[1].indexOf('carve-admonition') + 1]), cleaned[2]])]; if (a[1].includes('carve-directive')) return [withAttr({ type: 'directive', kind: a[1][a[1].indexOf('carve-directive') + 1] as 'toc', children, ...(kvs['carve-group-label'] !== undefined ? { groupLabel: kvs['carve-group-label'] } : {}), ...(title ? { title } : {}) }, [cleaned[0], cleaned[1].filter(x => x !== a[1][a[1].indexOf('carve-directive') + 1]), cleaned[2]])]; return [withAttr({ type: 'div', children, ...(kvs['carve-group-label'] !== undefined ? { groupLabel: kvs['carve-group-label'] } : {}), ...(title ? { title } : {}) }, cleaned)]; }
    case 'BulletList': return [{ type: 'list', marker: { kind: 'bullet', char: '-' }, spacing: c.every((item: P.PandocNode[]) => item.every(b => b.t !== 'Para')) ? 'tight' : 'loose', children: c.map((item: P.PandocNode[]) => importItem(item, warnings)) }];
    case 'OrderedList': { const example = c[0][1].t === 'Example'; const style = ({ LowerAlpha: 'a', UpperAlpha: 'A', LowerRoman: 'i', UpperRoman: 'I' } as Record<string, 'a'|'A'|'i'|'I'>)[c[0][1].t] ?? '1'; return [{ type: 'list', ...(example ? { attrs: { keyValues: [['carve-example', '1'], ['carve-example-delimiter', c[0][2].t]] as [string, string][] } } : {}), marker: { kind: 'ordered', style, delimiter: c[0][2].t === 'OneParen' ? ')' : '.', ...(c[0][0] === 1 ? {} : { start: c[0][0] }) }, spacing: c[1].every((item: P.PandocNode[]) => item.every(b => b.t !== 'Para')) ? 'tight' : 'loose', children: c[1].map((item: P.PandocNode[]) => importItem(item, warnings)) }]; }
    case 'LineBlock': return [{ type: 'line_block', children: c.map((line: P.PandocNode[]) => ({ type: 'line', children: inlineList(line, warnings) })) }];
    case 'DefinitionList': return [{ type: 'definition_list', children: c.flatMap((entry: [P.PandocNode[], P.PandocNode[][]]) => [{ type: 'definition_term', children: inlineList(entry[0], warnings) }, ...entry[1].map(xs => ({ type: 'definition_description', children: blockList(xs, warnings) }))]) }];
    case 'Figure': {
      const a = c[0] as P.Attr;
      const figureKind = a[2].find(([key]) => key === 'carve-figure-kind')?.[1];
      const nativeCaption: CaptionNode | undefined = c[1][1].length ? { type: 'caption', children: blockList(c[1][1], warnings), ...(c[1][0] ? { short: inlineList(c[1][0], warnings) } : {}) } : undefined;
      const savedCaption = a[2].find(([key]) => key === 'carve-caption')?.[1];
      let caption = nativeCaption;
      if (savedCaption) { try { caption = JSON.parse(savedCaption) as CaptionNode; } catch { warnings.push('Figure: invalid carve-caption carrier'); } }
      const children = blockList(c[2], warnings);
      const group = a[1].includes('carve-figure-group') || children.some(child => child.type === 'figure' || child.type === 'figure_group' || child.type === 'table');
      const attrs: P.Attr = [a[0], a[1].filter(name => name !== 'carve-figure-group'), a[2].filter(([key]) => key !== 'carve-figure-kind' && key !== 'carve-caption')];
      return [withAttr(group ? { type: 'figure_group', children, ...(caption ? { caption } : {}) } : { type: 'figure', children, ...(caption ? { caption } : {}), ...(figureKind ? { kind: figureKind as 'image' } : {}) }, attrs)];
    }
    case 'Table': return [importTable(c, warnings)];
    default: warnings.push(`${node.t}: unsupported Pandoc block`); return [];
  }
}

export function pandocToCarveAst(input: P.PandocDoc | string): { ast: DocumentNode; warnings: string[] } {
  const doc = typeof input === 'string' ? JSON.parse(input) as P.PandocDoc : input;
  const warnings: string[] = [];
  const metadata: NonNullable<DocumentNode['metadata']> = {};
  const metaInlines = (name: string): Inline[] | undefined => doc.meta?.[name]?.t === 'MetaInlines' ? inlineList(doc.meta[name]!.c as P.Inline[], warnings) : undefined;
  const title = metaInlines('title'); if (title) metadata.title = title;
  const subtitle = metaInlines('subtitle'); if (subtitle) metadata.subtitle = subtitle;
  const authors = doc.meta?.author;
  if (authors?.t === 'MetaList' && Array.isArray(authors.c)) metadata.authors = authors.c.map((author: P.PandocNode) => author.t === 'MetaInlines' ? (author.c as P.PandocNode[]).map(part => part.t === 'Str' ? String(part.c) : part.t === 'Space' ? ' ' : '').join('') : '').filter(Boolean);
  const date = doc.meta?.date;
  if (date?.t === 'MetaString') metadata.date = String(date.c);
  else if (date?.t === 'MetaInlines') metadata.date = (date.c as P.PandocNode[]).map(part => part.t === 'Str' ? String(part.c) : part.t === 'Space' ? ' ' : '').join('');
  const bibliography = doc.meta?.['carve-bibliography'];
  if (bibliography?.t === 'MetaString') { try { metadata.bibliography = JSON.parse(String(bibliography.c)); } catch { warnings.push('Metadata: invalid bibliography carrier'); } }
  for (const key of Object.keys(doc.meta ?? {})) if (!['title', 'subtitle', 'author', 'date', 'carve-bibliography'].includes(key)) warnings.push(`metadata ${key}: no typed 0.2 slot`);
  const ast: DocumentNode = { type: 'document', astVersion: '2.0', children: blockList(doc.blocks, warnings), ...(Object.keys(metadata).length ? { metadata } : {}) };
  validateTree(ast);
  return { ast, warnings };
}
export function pandocToCarve(input: P.PandocDoc | string): { carve: string; warnings: string[] } {
  const { ast, warnings } = pandocToCarveAst(input);
  const spelled = structuredClone(ast);
  const addEmptyItemComments = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(addEmptyItemComments); return; }
    const node = value as Record<string, unknown>;
    if (node.type === 'list_item' && Array.isArray(node.children) && node.children.length === 0) {
      node.children.push({ type: 'comment', form: 'line', value: '' });
      warnings.push('empty-list-item-spelled: an empty item uses a nonrendering comment in Carve source');
    }
    for (const child of Object.values(node)) addEmptyItemComments(child);
  };
  addEmptyItemComments(spelled);
  const output = writeWithDiagnostics(spelled);
  warnings.push(...output.diagnostics.map(d => `${d.code}: ${d.message}`));
  // The engine can elide an all-empty table without emitting a loss diagnostic.
  if (output.source === '') for (const node of ast.children) if (node.type === 'table') {
    warnings.push('structure-unspellable: an empty table node has no spelling in Carve source here');
    for (const group of node.children) if (group.attrs) warnings.push(`field-unspellable: the field attrs of a ${group.type} node has no spelling in Carve source here`);
  }
  return { carve: output.source, warnings };
}
