import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const data = JSON.parse(readFileSync(join(root, 'docs/roundtrip-0.2-data.json'), 'utf8'));
const testPort = readFileSync(join(root, 'docs/test-port-0.2.md'), 'utf8');
const findings = readFileSync(join(root, '..', '_FINDINGS.md'), 'utf8');
const formats = data.formats;
const counts = format => Object.values(data.cells).reduce((sum, row) => {
  sum[row[format].verdict] = (sum[row[format].verdict] ?? 0) + 1;
  return sum;
}, {});
const order = ['exact', 'same-meaning', 'same-rendering', 'same-text', 'lossy-by-nature', 'lossy', 'error'];
const lines = [
  '# Carve 0.2 consumer report', '',
  `Pandoc 3.14; engine ${JSON.parse(readFileSync(join(root, 'vendor/carve-v2/SOURCE.json'), 'utf8')).commit}; 99 Carve probes, 17 formats, 66 reverse Pandoc pairs.`, '',
  '## Test port', '',
  'The current 58-file census is **730 observed cases: 96 ported, 6 dropped with reasons, 628 pending**. The original URL-policy file aborted during a top-level 0.1 private import, so its 14 declared tests appear as one observed failure. [The table](pandoc-carve/docs/test-port-0.2.md) records every file and each intentional drop. The ungated full run after the initial port had 783 cases, 376 passing and 407 failing. Most failures still assert 0.1 tree fields, old CLI diagnostics, or 0.1 source forms; table and citation cases also expose bridge work. The old implementation and 0.1 dependency remain until those cases are handled.', '',
  ...testPort.split('\n').filter(line => line.startsWith('| ') && !line.includes('Total')).slice(0).map(line => line),
  '| Total | 730 | 96 | 6 | 628 |', '',
  '## Real Pandoc end-to-end checks', '',
  '| Format | Export examples | Import example | Result and format limit |',
  '| --- | ---: | --- | --- |',
  '| LaTeX | 3/3 | `paper.tex` 1/1 | Passed. The LaTeX reader does not reconstruct syntax-highlighted code or the spanning table from the writer output. |',
  '| Typst | 3/3 | — | Passed at text and supported structure level. |',
  '| DOCX | 3/3 | `report.md` → DOCX 1/1 | Passed at text and supported structure level. |',
  '| HTML | 3/3 | — | Passed at text and supported structure level. |',
  '| EPUB | 3/3 | — | Passed at text and supported structure level. |',
  '| RST | — | `notes.rst` 1/1 | Passed at text and heading structure level. |', '',
  '## Format measurement', '',
  '| Format | Exact | Same meaning | Same rendering | Same text | Lossy by nature | Lossy | Error |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...formats.map(format => { const c = counts(format); return `| ${format} | ${order.map(key => c[key] ?? 0).join(' | ')} |`; }), '',
  'Lossy by nature means the destination lacks a source role or attribute but the reader retains visible words and critical links, images, cells, math, code and format-matched raw content. Plain lossy means words or a critical content fact changed. The classification uses the vendored node-slot data, visible-word comparison with HTML tags removed, and the first differing block. The [data and full grid](pandoc-carve/docs/roundtrip-0.2.md) retain the Pandoc snapshots and attribution.', '',
  'The GFM writer emits raw HTML for many attributes and spans; the GFM reader returns those fragments as raw HTML. The bridge does not rebuild typed nodes from those fragments. The earlier comparison counted HTML markup as prose, inflating the GFM loss count. The revised count is shown above; remaining real GFM losses include link and image targets, table cells, code and math content, and visible titles.', '',
  '### Every plain lossy cell', '',
];
for (const format of formats) {
  const losses = Object.entries(data.cells).filter(([, row]) => row[format].verdict === 'lossy');
  if (!losses.length) continue;
  lines.push(`#### ${format} (${losses.length})`, '');
  for (const [probe, row] of losses) {
    const cause = (row[format].lossCause ?? 'unclassified').replace(/\s+/g, ' ').slice(0, 240);
    lines.push(`- **${probe}:** ${cause}`);
  }
  lines.push('');
}
lines.push('## Findings ranked by cost after freeze', '', findings.replace(/^# Carve 0\.2 consumer findings\n\n/u, '').trim(), '', '## Three-line verdict', '',
  'Ready to freeze from this consumer view: **No**; the engine rejects root header and footer metadata promised by the spec, and the old bridge suite is still largely unported.',
  'Must change before freeze: align the root metadata contract and decide how abstract and other foreign metadata are carried; finish the 0.1 test port and remove its implementation and dependency.',
  'Would be nice: a typed Example counter and stable quote-pair identity, plus native handling of GFM raw HTML carriers.', '');
writeFileSync(join(root, '..', '_REPORT.md'), lines.join('\n'));
console.log(`wrote ${join(root, '..', '_REPORT.md')}`);
