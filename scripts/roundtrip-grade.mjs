import { render, treesEqual } from '../vendor/carve-v2/index.js';

// Each source-only equivalence has one deliberately narrow rule. The order is
// significant: references resolve before definitions can be discarded.
export const meaningRules = [
  ['generated/authored heading id with the same value', headingIdProvenance],
  ['autolink/link with destination as text', autolinkSpelling],
  ['bullet glyph and ordered-list delimiter', listMarkerSpelling],
  ['smart punctuation/text with the same character', smartPunctuationSpelling],
  ['comments of any form', removeComments],
  ['literal inline/code span', literalInlineSpelling],
  ['reference/inline link with the same destination', referenceLinkSpelling],
  ['absent/empty tooltip', emptyTooltip],
  ['span marks with equal resolved counts', resolvedSpanMarks],
  ['explicit zero head rows/none', zeroHeadRows],
  ['attribute order', attributeOrder],
  ['unreferenced definitions with equal resolved targets', unreferencedDefinitions],
];

function walk(value, visit) {
  if (Array.isArray(value)) return value.map(v => walk(v, visit)).filter(v => v !== undefined);
  if (!value || typeof value !== 'object') return value;
  const node = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, visit)]));
  return visit(node);
}
function headingIdProvenance(tree) {
  return walk(tree, n => {
    if (n.type !== 'heading' || !n.generatedId) return n;
    const attrs = { ...n.attrs };
    if (!attrs.id) attrs.id = n.generatedId;
    return { ...n, attrs, generatedId: undefined };
  });
}
function autolinkSpelling(tree) {
  return walk(tree, n => n.type === 'autolink' ? { ...n, type: 'link', children: [{ type: 'text', value: n.href }] } : n);
}
function listMarkerSpelling(tree) {
  return walk(tree, n => {
    if (n.type !== 'list' || !n.marker) return n;
    const marker = { ...n.marker };
    if (marker.kind === 'bullet') delete marker.char;
    if (marker.kind === 'ordered') delete marker.delimiter;
    return { ...n, marker };
  });
}
function smartPunctuationSpelling(tree) {
  return walk(tree, n => n.type === 'smart_punctuation' ? { type: 'text', value: n.glyph } : n);
}
function removeComments(tree) {
  return walk(tree, n => n.type === 'comment' || n.type === 'editorial_comment' ? undefined : n);
}
function literalInlineSpelling(tree) {
  return walk(tree, n => n.type === 'literal_inline' ? { ...n, type: 'code' } : n);
}
function referenceLinkSpelling(tree) {
  const defs = new Map((tree.children ?? []).filter(n => n.type === 'link_reference_definition').map(n => [n.key, n]));
  return walk(tree, n => {
    if (n.type !== 'link' || !n.key) return n;
    const def = defs.get(n.key);
    if (!def || (n.href && n.href !== def.href)) return n;
    const { key, namespace, form, ...rest } = n;
    return { ...rest, href: def.href,
      ...(def.title && !n.title ? { title: def.title } : {}), __resolvedReferenceKey: key };
  });
}
function emptyTooltip(tree) {
  return walk(tree, n => {
    if (n.tooltip !== '') return n;
    const { tooltip, ...rest } = n;
    return rest;
  });
}
function resolvedSpanMarks(tree) {
  return walk(tree, n => {
    if (n.type !== 'table_cell') return n;
    const { span, ...rest } = n;
    if (span && n.children?.length) return n; // a covered cell is structural
    return span ? rest : n;
  });
}
function zeroHeadRows(tree) {
  return walk(tree, n => {
    if (n.type !== 'table_body' || n.headRows !== 0) return n;
    const { headRows, ...rest } = n;
    return rest;
  });
}
function attributeOrder(tree) {
  return walk(tree, n => {
    if (!n.attrs) return n;
    return { ...n, attrs: { ...n.attrs,
      ...(n.attrs.classes ? { classes: [...n.attrs.classes].sort() } : {}),
      ...(n.attrs.keyValues ? { keyValues: [...n.attrs.keyValues].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)) } : {}) } };
  });
}
function unreferencedDefinitions(tree) {
  const resolved = new Set(), stillUsed = new Set();
  walk(tree, n => { if (n.__resolvedReferenceKey) resolved.add(n.__resolvedReferenceKey);
    if (n.key && ['link', 'image', 'xref'].includes(n.type)) stillUsed.add(n.key); return n; });
  return walk(tree, n => {
    if (n.type === 'link_reference_definition' && resolved.has(n.key) && !stillUsed.has(n.key)) return undefined;
    if (!n.__resolvedReferenceKey) return n;
    const { __resolvedReferenceKey, ...rest } = n;
    return rest;
  });
}

function comparable(tree) {
  return walk(tree, n => {
    for (const k of ['pos', 'segments', 'srcByteLength', 'stages', 'generatedId', 'resolvedAlign']) delete n[k];
    if (n.type === 'caption_number') delete n.n;
    if (['footnote_ref', 'inline_footnote'].includes(n.type)) delete n.number;
    if (n.key && ['link', 'image', 'xref'].includes(n.type)) { delete n.href; delete n.src; }
    if (n.type === 'table_cell') { if (n.rowspan === 1) delete n.rowspan; if (n.colspan === 1) delete n.colspan; }
    if (n.attrs && !Object.keys(n.attrs).length) delete n.attrs;
    return n;
  });
}
export function meaningTree(tree) {
  return comparable(meaningRules.reduce((t, [, fn]) => fn(t), structuredClone(tree)));
}
function headingIds(tree) {
  const ids = [];
  walk(tree, n => { if (n.type === 'heading') ids.push({ id: n.attrs?.id ?? n.generatedId, generated: !!n.generatedId && !n.attrs?.id }); return n; });
  return ids;
}
function rendered(tree, dropIds) {
  let html = render(tree).replace(/>\s+</g, '><').trim();
  for (const id of dropIds) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(` id="${escaped}"`, 'g'), '');
  }
  return html;
}
function nodeText(n) {
  if (Array.isArray(n)) return n.map(nodeText).join('');
  if (!n || typeof n !== 'object') return '';
  if (n.type === 'comment' || n.type === 'editorial_comment' || n.type?.endsWith('_definition')) return '';
  if (n.type === 'autolink') return n.href ?? '';
  if (n.type === 'image') return n.alt ?? nodeText(n.children);
  if (n.type === 'smart_punctuation') return n.glyph ?? '';
  if (n.type === 'soft_break') return ' ';
  if (n.type === 'hard_break') return '\n';
  if (n.type === 'footnote_ref') return '';
  if (typeof n.value === 'string') return n.type === 'code_block' ? n.value.replace(/\n$/, '') : n.value;
  return nodeText(n.children ?? n.title ?? []);
}
function blockTexts(tree) {
  const blocks = [];
  function visit(n) {
    if (!n || typeof n !== 'object') return;
    if (['paragraph', 'heading', 'cell_paragraph', 'code_block', 'raw_block', 'line_block', 'math_block', 'thematic_break'].includes(n.type)) {
      blocks.push({ type: n.type, text: nodeText(n) });
      if (n.caption) visit(n.caption);
      if (n.title) blocks.push({ type: `${n.type} title`, text: nodeText(n.title) });
      return;
    }
    if (n.caption) visit(n.caption);
    if (n.title) blocks.push({ type: `${n.type} title`, text: nodeText(n.title) });
    for (const c of n.children ?? []) visit(c);
  }
  visit(tree);
  return blocks;
}
function firstBlockDifference(a, b) {
  const left = blockTexts(a), right = blockTexts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i]?.text !== right[i]?.text) return { index: i + 1,
      beforeType: left[i]?.type ?? null, afterType: right[i]?.type ?? null,
      before: left[i]?.text ?? null, after: right[i]?.text ?? null };
  }
  return null;
}
const featureNames = ['inline role', 'attribute', 'table structure', 'table alignment', 'caption', 'footnote', 'math', 'code language', 'raw content', 'link target', 'image', 'list structure', 'task state', 'container role', 'heading level or id', 'frontmatter', 'comment'];
function featureFor(node, key, other) {
  const type = node?.type ?? other?.type ?? '';
  if (/comment/.test(type) || /comment/.test(other?.type ?? '')) return 'comment';
  if (/frontmatter/.test(type) || key === 'meta') return 'frontmatter';
  if (/heading/.test(type) || /heading/.test(other?.type ?? '')) return 'heading level or id';
  if (/table|cell/.test(type) || /table|cell/.test(other?.type ?? '')) {
    if (/align/.test(key) || type === 'table_column') return 'table alignment';
    if (/caption/.test(key)) return 'caption';
    return 'table structure';
  }
  if (/caption/.test(type) || /caption/.test(key)) return 'caption';
  if (/footnote/.test(type) || /footnote/.test(other?.type ?? '')) return 'footnote';
  if (/math/.test(type) || /math/.test(other?.type ?? '')) return 'math';
  if (/code/.test(type) && /language|syntax|classes/.test(key)) return 'code language';
  if (/raw/.test(type) || /raw/.test(other?.type ?? '')) return 'raw content';
  if (/link|autolink|xref/.test(type) && /href|key|target|src/.test(key)) return 'link target';
  if (/image/.test(type) || /image/.test(other?.type ?? '')) return 'image';
  if (/task/.test(type) || /task/.test(key)) return 'task state';
  if (/list/.test(type) || /list/.test(other?.type ?? '') || key === 'marker' || key === 'spacing') return 'list structure';
  if (/figure|quote|admonition|directive|div|container/.test(type) || /figure|quote|admonition|directive|div|container/.test(other?.type ?? '')) return 'container role';
  if (/attrs|classes|keyValues|tooltip/.test(key)) return 'attribute';
  return 'inline role';
}
export function degradedFeatures(a, b) {
  const found = new Set();
  function diff(x, y, parent, key) {
    if (JSON.stringify(x) === JSON.stringify(y)) return;
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) found.add(featureFor(parent, key, null));
      for (let i = 0; i < Math.max(x.length, y.length); i++) diff(x[i], y[i], parent, key);
    } else if (x && y && typeof x === 'object' && typeof y === 'object') {
      if (x.type && y.type && x.type !== y.type) found.add(featureFor(x, 'type', y));
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
        if (['pos', 'segments', 'srcByteLength', 'stages', 'generatedId', 'resolvedAlign', 'n'].includes(k)) continue;
        diff(x[k], y[k], x.type ? x : parent, k);
      }
    } else found.add(featureFor(parent, key, y));
  }
  diff(comparable(structuredClone(a)), comparable(structuredClone(b)), a, 'children');
  return featureNames.filter(f => found.has(f));
}
export function grade(a, b) {
  if (treesEqual(a, b)) return { verdict: 'exact' };
  if (treesEqual(meaningTree(a), meaningTree(b))) return { verdict: 'same-meaning' };
  const features = degradedFeatures(a, b);
  try {
    const ah = headingIds(a), bh = headingIds(b), dropA = new Set(), dropB = new Set();
    for (let i = 0; i < Math.min(ah.length, bh.length); i++) {
      if (ah[i].generated || bh[i].generated) { if (ah[i].id) dropA.add(ah[i].id); if (bh[i].id) dropB.add(bh[i].id); }
    }
    if (rendered(a, dropA) === rendered(b, dropB)) return { verdict: 'same-rendering', features };
  }
  catch { /* Some valid imported raw nodes have no render profile; continue. */ }
  const differenceBlock = firstBlockDifference(a, b);
  return differenceBlock ? { verdict: 'lossy', features, differenceBlock } : { verdict: 'same-text', features };
}
