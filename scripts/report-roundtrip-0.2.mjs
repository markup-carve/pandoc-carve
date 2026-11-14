import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse } from '../vendor/carve-v2/index.js';
import { meaningRules } from './roundtrip-grade.mjs';

const root = resolve(import.meta.dirname, '..');
const data = JSON.parse(readFileSync(process.env.CARVE_RT_OUTPUT || join(root, 'docs/roundtrip-0.2-data.json'), 'utf8'));
const order = ['exact', 'same-meaning', 'same-rendering', 'same-text', 'lossy', 'error'];
const label = v => ({ exact: 'E', 'same-meaning': 'M', 'same-rendering': 'R', 'same-text': 'T', lossy: 'L', error: '!' })[v] ?? '?';
const names = data.formats;
const probes = data.probes.map(f => f.replace(/\.crv$/, ''));
const counts = Object.fromEntries(names.map(fmt => [fmt, Object.fromEntries(order.map(v => [v, probes.filter(p => data.cells[p][fmt].verdict === v).length]))]));

function sourceFeatures(name) {
  const ast = parse(readFileSync(join(root, 'test/fixtures/probes-0.2', `${name}.crv`), 'utf8'));
  const found = new Set();
  function walk(n) {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    const t = n.type ?? '';
    if (n.attrs) found.add('attribute');
    if (t === 'table') found.add('table structure');
    if (t === 'table_column' && (n.align || n.width)) found.add('table alignment');
    if (/caption/.test(t) || n.caption) found.add('caption');
    if (/footnote/.test(t)) found.add('footnote');
    if (/math/.test(t)) found.add('math');
    if (/code/.test(t) && (n.syntax || n.language || n.attrs?.classes?.length)) found.add('code language');
    if (/raw/.test(t)) found.add('raw content');
    if (['link', 'autolink', 'xref'].includes(t)) found.add('link target');
    if (t === 'image') found.add('image');
    if (t === 'list') found.add('list structure');
    if (n.task || t === 'task') found.add('task state');
    if (/figure|quote|admonition|directive|div|container/.test(t)) found.add('container role');
    if (t === 'heading') found.add('heading level or id');
    if (/frontmatter/.test(t)) found.add('frontmatter');
    if (/comment/.test(t)) found.add('comment');
    if (['emphasis', 'strong', 'underline', 'strike', 'highlight', 'superscript', 'subscript', 'small_caps', 'span', 'code', 'literal_inline', 'smart_punctuation', 'autolink', 'link', 'image', 'citation_group'].includes(t)) found.add('inline role');
    Object.values(n).forEach(walk);
  }
  walk(ast);
  return found;
}
const present = Object.fromEntries(probes.map(p => [p, sourceFeatures(p)]));
const features = ['inline role', 'attribute', 'table structure', 'table alignment', 'caption', 'footnote', 'math', 'code language', 'raw content', 'link target', 'image', 'list structure', 'task state', 'container role', 'heading level or id', 'frontmatter', 'comment'];
const direct = data.reverse.direct;
const reverseNames = data.reverse.probes;
const need = {
  quoted_double: 'quote kind and quoted span on an inline node', quoted_single: 'quote kind and quoted span on an inline node',
  ol_example: 'ordered-list Example style on list.marker',
};
function needFor(p) {
  if (need[p]) return need[p];
  if (/^raw/.test(p)) return 'raw content node with format';
  if (/^table_/.test(p)) return /align|width/.test(p) ? 'column or cell alignment/width field on table' : 'table row, cell, or section field';
  if (/^ol_/.test(p)) return 'ordered-list marker field on list';
  if (/^image_/.test(p)) return 'image attribute field or carve.style';
  if (/attrs/.test(p)) return 'attribute field on the corresponding node';
  if (/^code/.test(p)) return 'code field on code node';
  if (/^figure/.test(p)) return 'figure field on figure node';
  if (/^line/.test(p)) return 'line node or carve.source';
  if (/^cite/.test(p)) return 'citation field on citation node';
  return 'carve.source or a typed field on the corresponding node';
}
function rank() {
  return reverseNames.filter(p => direct[p].verdict !== 'typed').map(p => {
    const carriers = names.filter(fmt => data.reverse.formats[fmt]?.[p]?.formatCarries);
    return { p, carriers, verdict: direct[p].verdict, need: needFor(p) };
  }).sort((a, b) => b.carriers.length - a.carriers.length || a.p.localeCompare(b.p));
}
const gaps = rank();
const md = [];
md.push('# Carve 0.2 format round trips', '', `${data.version}. ${probes.length} Carve probes × ${names.length} readable formats; ${reverseNames.length} Pandoc rich/degraded pairs in the reverse direction.`, '',
  '## Verdict ladder', '',
  'The first true rung wins: **exact** uses the vendored engine’s `treesEqual`; **same-meaning** applies only the source/provenance rules below; **same-rendering** compares vendored HTML after collapsing whitespace between tags and dropping generated heading IDs; **same-text** compares plain text block by block; **lossy** names the first differing block; **error** records the failing stage.', '',
  'The same-meaning rules, in script order, are:', '',
  ...meaningRules.map(([description], i) => `${i + 1}. ${description}.`), '',
  'These rules do not remove text, block structure, emphasis family, link destinations, images, table cells, math, code content or language, footnote content, task state, attribute values, or classes. The vendored engine’s equality already ignores positions and computed resolution fields.', '',
  '## Per-format summary', '',
  '| Format | Exact | Same meaning | Same rendering | Same text | Lossy | Error |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...names.map(f => `| ${f} | ${order.map(v => counts[f][v]).join(' | ')} |`), '',
  '## Carve-to-format grid', '',
  'E = exact; M = same meaning; R = same rendering; T = same text; L = lossy; ! = error. First differing block, degraded feature names, attribution, and Pandoc snapshots are in [the data](roundtrip-0.2-data.json).', '',
  `| Probe | ${names.join(' | ')} |`, `| --- | ${names.map(() => ':---:').join(' | ')} |`,
  ...probes.map(p => `| [${p}](../test/fixtures/probes-0.2/${p}.crv) | ${names.map(f => label(data.cells[p][f].verdict)).join(' | ')} |`), '',
  '## Features in Carve sources', '',
  'For each feature, the table lists the *worst* rung among probes whose source tree contains that feature. A format appears under the best rung it guarantees across those probes. Lossy formats are omitted; this is deliberately stricter than finding one successful example.', '',
  '| Feature | Exact | Same meaning | Same rendering | Same text |', '| --- | --- | --- | --- | --- |');
for (const feature of features) {
  const ps = probes.filter(p => present[p].has(feature));
  const by = Object.fromEntries(order.map(v => [v, []]));
  for (const fmt of names) {
    if (!ps.length) continue;
    const worst = ps.map(p => data.cells[p][fmt].verdict).sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
    by[worst].push(fmt);
  }
  md.push(`| ${feature} (${ps.length} ${ps.length === 1 ? 'probe' : 'probes'}) | ${order.slice(0, 4).map(v => by[v].join(', ') || '—').join(' | ')} |`);
}
md.push('', '## Attribution', '',
  'The data records bridge on export, Pandoc writer, Pandoc reader, bridge on import, or tree comparison for every nonexact cell. For text formats, the original and observed degraded tree are both written with the same Pandoc options; identical output supports writer loss, different output supports reader loss. For binary formats, the writer/reader split remains undetermined. This differential is evidence about the observed degradation, not a claim that every intermediate difference has one cause.', '',
  '## Pandoc-to-Carve result', '',
  'Direct means Pandoc JSON → validated Carve tree → Pandoc JSON. **typed** requires the pair’s distinction in a typed tree field/node and the rich Pandoc AST to come back; **data** means it comes back solely through opaque data or a marker attribute; **dropped** means it does not come back; **refused** means the bridge or validator rejected it. Format cells compare real-file rich and degraded imports: **S** = same tree as direct rich import, **K** = distinction survives in a changed tree, **L** = distinction lost in the tree, **!** = error. A trailing **+** means Pandoc’s reader still distinguishes rich from degraded; **−** means the format erased that distinction. Thus S+ beside a dropped direct result means the format carries the feature but the tree already lacks it.', '',
  `| Pandoc probe | Direct | ${names.join(' | ')} |`, `| --- | --- | ${names.map(() => ':---:').join(' | ')} |`,
  ...reverseNames.map(p => `| ${p} | ${direct[p].verdict}${direct[p].carrier?.length ? ` (${direct[p].carrier.join(', ')})` : ''} | ${names.map(f => { const cell = data.reverse.formats[f]?.[p]; return cell?.verdict === 'error' ? '!' : `${({ 'same-tree': 'S', kept: 'K', lost: 'L' })[cell?.verdict] ?? '?'}${cell?.formatCarries ? '+' : '−'}`; }).join(' | ')} |`), '',
  '## Pandoc features without a typed round trip', '',
  'Ranked by the number of these formats whose Pandoc writer/reader can carry the rich/degraded distinction. The need names the tree location or standard namespace; it does not imply a specification change is already approved.', '',
  '| Probe | Direct | Formats carrying it | Need |', '| --- | --- | ---: | --- |',
  ...gaps.map(g => `| ${g.p} | ${g.verdict} | ${g.carriers.length}: ${g.carriers.join(', ') || '—'} | ${g.need} |`), '',
  '## Reproduce', '',
  '`npm run build && node scripts/roundtrip-formats.mjs && node scripts/report-roundtrip-0.2.mjs` with Pandoc 3.14 on PATH. The fidelity pairs and their image resource were copied from `pandoc-format-fidelity/results/probes.json` and `fixtures/i.png` at commit `480beefd3e9a6227e8564dd8bfebf7528b659df8`; see that project’s README and `src/probes.py`, `src/run_matrix.py`, and `src/run_roundtrip.py` for the pair method.');
writeFileSync(join(root, 'docs/roundtrip-0.2.md'), md.join('\n') + '\n');

const families = {
  'office formats (DOCX, ODT)': ['docx', 'odt'],
  'web and publication formats (EPUB, HTML, JATS, DocBook)': ['epub', 'html', 'jats', 'docbook'],
  'the remaining markup and notebook formats (eleven)': names.filter(f => !['docx', 'odt', 'epub', 'html', 'jats', 'docbook'].includes(f)),
};
const familySentence = ([name, fmts]) => {
  const n = fmts.length * probes.length;
  const c = Object.fromEntries(order.map(v => [v, fmts.reduce((sum, f) => sum + counts[f][v], 0)]));
  const percent = x => `${Math.round(100 * x / n)}%`;
  return `Across ${name}, ${percent(c.exact + c['same-meaning'])} of probe cells preserve meaning, ${percent(c.exact + c['same-meaning'] + c['same-rendering'])} preserve rendering, and ${percent(c.exact + c['same-meaning'] + c['same-rendering'] + c['same-text'])} preserve block text.`;
};
const notDetermined = Object.values(data.cells).flatMap(row => Object.values(row)).filter(c => /not determined|unavailable/.test(c.attribution ?? '')).length;
const report = ['# Carve 0.2 round-trip measurement', '', `${data.version}; ${probes.length} Carve probes, ${names.length} formats, ${reverseNames.length} Pandoc pairs.`, '',
  '| Format | Exact | Same meaning | Same rendering | Same text | Lossy |', '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...names.map(f => `| ${f} | ${order.slice(0, 5).map(v => counts[f][v]).join(' | ')} |`), '',
  ...Object.entries(families).map(familySentence), '',
  `Reverse direct result: ${['typed', 'data', 'dropped', 'refused'].map(v => `${reverseNames.filter(p => direct[p].verdict === v).length} ${v}`).join(', ')}.`, '',
  'Untyped Pandoc features ranked by readable formats that carry them:', '',
  '| Probe | Formats | Need |', '| --- | ---: | --- |',
  ...gaps.map(g => `| ${g.p} (${g.verdict}) | ${g.carriers.length} | ${g.need} |`), '',
  `Could not determine a writer/reader split for ${notDetermined} forward cells, all in DOCX, ODT, or EPUB; appearance in applications outside Pandoc was not measured. Visual quote punctuation alone does not restore Pandoc’s typed Quoted node.`, '',
  'Full grids, per-cell evidence, and reproduction instructions: [docs/roundtrip-0.2.md](pandoc-carve/docs/roundtrip-0.2.md).'];
writeFileSync(resolve(root, '..', '_REPORT.md'), report.join('\n') + '\n');
console.log('wrote docs/roundtrip-0.2.md and ../_REPORT.md');
