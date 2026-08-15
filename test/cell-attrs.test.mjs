import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { parse } from '@markup-carve/carve';
import { carveToPandoc, carveAstToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();

/*
 * A cell's attribute block is glued to the opening pipe (`|{.x} content`) and a
 * row's follows the closing one (`| a | b |{.cls}`) - grammar PART 7, corpus
 * case `99-table-cell-attributes`. Pandoc has an `Attr` on both `Cell` and
 * `Row`, so neither is a degradation; both were simply dropped, with no warning
 * in either direction. Measured before this file existed: every converted cell
 * and row carried `["", [], []]`, and the reverse direction discarded the Attr
 * it destructured past.
 *
 * A space before the brace is ordinary content, which is why every fixture here
 * glues it.
 */

const SRC = '|=A |=B |\n|---|---|\n|{#c1 .hi k=v} c |{.y} d |{.rowcls}\n';

const bodyOf = (doc) => doc.blocks[0].c[4][0][3];
const headOf = (doc) => doc.blocks[0].c[3][1];

test('cell attrs: a cell attribute block reaches pandoc as the cell Attr', () => {
  const { doc, warnings } = carveToPandoc(SRC);
  const cells = bodyOf(doc)[0][1];
  assert.deepEqual(cells[0][0], ['c1', ['hi'], [['k', 'v']]]);
  assert.deepEqual(cells[1][0], ['', ['y'], []]);
  assert.deepEqual(warnings, []);
});

test('cell attrs: a row attribute block reaches pandoc as the row Attr', () => {
  const { doc } = carveToPandoc(SRC);
  assert.deepEqual(bodyOf(doc)[0][0], ['', ['rowcls'], []]);
});

test('cell attrs: a cell with no attributes still carries the empty Attr', () => {
  const { doc } = carveToPandoc('|=A |\n|---|\n| plain |\n');
  assert.deepEqual(bodyOf(doc)[0][1][0][0], ['', [], []]);
  assert.deepEqual(bodyOf(doc)[0][0], ['', [], []]);
});

test('cell attrs: both Attrs come back on the way in', () => {
  const { doc } = carveToPandoc(SRC);
  const { ast } = pandocToCarveAst(doc);
  const row = ast.children[0].rows[1];
  assert.deepEqual(row.attrs, { classes: ['rowcls'], order: ['.class'] });
  assert.deepEqual(row.cells[0].attrs, {
    id: 'c1',
    classes: ['hi'],
    keyValues: { k: 'v' },
    order: ['#id', '.class', 'key'],
  });
  assert.deepEqual(row.cells[1].attrs, { classes: ['y'], order: ['.class'] });
});

test('cell attrs: the round trip preserves them through Carve source', () => {
  const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'pos' ? undefined : v)));
  const source = pandocToCarve(carveToPandoc(SRC).doc).carve;
  assert.ok(source.includes('{#c1 .hi k=v}'), source);
  assert.ok(source.includes('{.rowcls}'), source);
  // Not byte-identical: fmt normalizes the padding inside a cell. The AST is
  // what has to survive, and it does.
  assert.deepEqual(strip(parse(source)).children, strip(parse(SRC)).children);
});

test('cell attrs: a head-row cell keeps its Attr too', () => {
  // `|=` header cells have no attribute slot in the grammar, but a header
  // derived from the delimiter row does, and that is the shape fmt writes.
  const src = '|{.hh}H|\n|---|\n|{.dd}d|\n';
  const { doc } = carveToPandoc(src);
  assert.deepEqual(headOf(doc)[0][1][0][0], ['', ['hh'], []]);
  const { ast } = pandocToCarveAst(doc);
  assert.deepEqual(ast.children[0].rows[0].cells[0].attrs, { classes: ['hh'], order: ['.class'] });
  assert.equal(ast.children[0].rows[0].cells[0].header, true);
});

test('cell attrs: attributes on a continuation cell are reported, not dropped quietly', () => {
  // The grammar cannot produce this - a cell carrying attributes is never a
  // bare span cell - but the exchange AST can, and pandoc omits covered
  // positions entirely, so there is no node left to hang them on.
  const ast = {
    type: 'document',
    children: [
      {
        type: 'table',
        rows: [
          {
            type: 'table_row',
            cells: [
              { type: 'table_cell', header: false, children: [{ type: 'text', value: 'a' }] },
              {
                type: 'table_cell',
                header: false,
                children: [],
                span: 'colspan',
                attrs: { classes: ['zz'], order: ['.class'] },
              },
            ],
          },
        ],
      },
    ],
  };
  const { doc, warnings } = carveAstToPandoc(ast);
  assert.equal(bodyOf(doc)[0][1].length, 1, 'the covered position is not emitted');
  assert.ok(
    warnings.some((w) => w.includes('continuation cell at row 1, col 2')),
    warnings.join(' | '),
  );
});

test('cell attrs: an ORPHAN continuation keeps its attributes and is not reported', () => {
  // A continuation with no origin does not resolve: it falls through and
  // becomes a real cell, which carries the attributes. Warning there would
  // report a loss that did not happen.
  const ast = {
    type: 'document',
    children: [
      {
        type: 'table',
        rows: [
          {
            type: 'table_row',
            cells: [
              {
                type: 'table_cell',
                header: false,
                children: [],
                span: 'colspan',
                attrs: { classes: ['orphan'], order: ['.class'] },
              },
            ],
          },
        ],
      },
    ],
  };
  const { doc, warnings } = carveAstToPandoc(ast);
  assert.deepEqual(bodyOf(doc)[0][1][0][0], ['', ['orphan'], []], 'kept on the fallback cell');
  assert.ok(
    warnings.some((w) => w.includes('has no origin')),
    'the orphan itself is still reported',
  );
  assert.ok(
    !warnings.some((w) => w.includes('are dropped')),
    `nothing was dropped: ${warnings.join(' | ')}`,
  );
});

test('cell attrs: rowGroups and cell attrs compose', () => {
  // The row-group partition rebuilds the row lists; the attrs must ride along
  // rather than being lost at the split.
  const ast = {
    type: 'document',
    children: [
      {
        type: 'table',
        rows: [
          { type: 'table_row', cells: [{ type: 'table_cell', header: true, children: [{ type: 'text', value: 'H' }] }] },
          {
            type: 'table_row',
            attrs: { classes: ['br'], order: ['.class'] },
            cells: [{ type: 'table_cell', header: false, children: [{ type: 'text', value: 'b' }], attrs: { id: 'bc' } }],
          },
          {
            type: 'table_row',
            attrs: { classes: ['fr'], order: ['.class'] },
            cells: [{ type: 'table_cell', header: false, children: [{ type: 'text', value: 'f' }] }],
          },
        ],
        rowGroups: { headRows: 1, bodies: [{ headRows: 0, bodyRows: 1 }], footRows: 1 },
      },
    ],
  };
  const { doc } = carveAstToPandoc(ast);
  assert.deepEqual(bodyOf(doc)[0][0], ['', ['br'], []], 'body row attr');
  assert.deepEqual(bodyOf(doc)[0][1][0][0], ['bc', [], []], 'body cell attr');
  assert.deepEqual(doc.blocks[0].c[5][1][0][0], ['', ['fr'], []], 'foot row attr');

  const back = pandocToCarveAst(doc).ast.children[0];
  assert.deepEqual(back.rows[1].attrs, { classes: ['br'], order: ['.class'] });
  assert.deepEqual(back.rows[2].attrs, { classes: ['fr'], order: ['.class'] });
  assert.equal(back.rowGroups.footRows, 1);
});

test('cell attrs: pandoc writes them into HTML', { skip: !pandoc && 'pandoc not found' }, () => {
  const { doc } = carveToPandoc(SRC);
  const html = pandocRender(pandoc, doc, 'html');
  assert.ok(html.includes('id="c1"'), html);
  assert.ok(/class="[^"]*\bhi\b/.test(html), html);
  assert.ok(/class="[^"]*\browcls\b/.test(html), html);
  assert.ok(html.includes('k="v"'), html);
});

test('cell attrs: a table pandoc read from HTML imports both Attrs', { skip: !pandoc && 'pandoc not found' }, () => {
  // Pandoc's own reader is the fixture. Its grid-table syntax has no attribute
  // spelling, but HTML does, and this is the shape a Word or Docs export takes.
  const doc = JSON.parse(
    execFileSync(pandoc, ['-f', 'html', '-t', 'json'], {
      input: '<table><tr class="rr"><td id="c" class="cc" data-k="v">a</td></tr></table>',
      encoding: 'utf8',
    }),
  );
  assert.deepEqual(bodyOf(doc)[0][0], ['', ['rr'], []], 'the premise: pandoc kept the row class');

  const { ast } = pandocToCarveAst(doc);
  const row = ast.children[0].rows[0];
  assert.deepEqual(row.attrs, { classes: ['rr'], order: ['.class'] });
  assert.deepEqual(row.cells[0].attrs, {
    id: 'c',
    classes: ['cc'],
    keyValues: { k: 'v' },
    order: ['#id', '.class', 'key'],
  });

  const source = pandocToCarve(doc).carve;
  assert.ok(source.includes('{#c .cc k=v}'), source);
  assert.ok(source.includes('{.rr}'), source);
});
