/*
 * A table's head, body groups and foot, in both directions (PART 12 §15).
 *
 * The field holds COUNTS, never rows, so a grouping partitions the table's
 * flat `rows` rather than restating them. Pandoc's model is the one it is cut
 * to: `TableHead`, a LIST of `TableBody` (each with its own intermediate
 * header rows and a `RowHeadColumns`), and a `TableFoot`.
 *
 * §15 requires as a MUST that the counts account for every row exactly once,
 * and JSON Schema cannot express a cross-field sum - the upstream schema
 * deliberately does not check it, and an upstream test pins that a non-summing
 * partition still validates. A green validator is therefore no evidence at
 * all here, which is why the bridge checks the sum itself and why the check
 * has a test that watches it fail.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

// --- Carve AST fixtures -----------------------------------------------------

const cell = (value, header = false) => ({
  type: 'table_cell',
  ...(header ? { header: true } : {}),
  children: [{ type: 'text', value }],
});

const row = (values, header = false) => ({
  type: 'table_row',
  cells: values.map((v) => cell(v, header)),
});

/**
 * Five rows: one head row, a body of one row, a second body with its own
 * header row, and a foot row.
 */
function tableAst(rowGroups) {
  const table = {
    type: 'table',
    caption: [{ type: 'text', value: 'Quarterly totals' }],
    shortCaption: [{ type: 'text', value: 'Totals' }],
    rows: [
      row(['Region', 'Total'], true),
      row(['North', '11']),
      row(['South region', 'Total'], true),
      row(['South', '22']),
      row(['All', '33']),
    ],
  };
  if (rowGroups) table.rowGroups = rowGroups;
  return { type: 'document', children: [table] };
}

const partition = {
  headRows: 1,
  bodies: [
    { headRows: 0, bodyRows: 1, rowHeadColumns: 1 },
    { headRows: 1, bodyRows: 1 },
  ],
  footRows: 1,
};

/** The text of a row's first cell, with pandoc's Str/Space split rejoined. */
function cellText(pandocRow) {
  const blocks = pandocRow[1][0][4];
  return blocks[0].c.map((x) => (x.t === 'Space' ? ' ' : x.c)).join('');
}

/** The parts of a pandoc Table this file asserts on. */
function tableParts(doc) {
  const t = doc.blocks[0];
  assert.equal(t.t, 'Table', 'expected a Table block');
  const [, caption, , head, bodies, foot] = t.c;
  return {
    shortCaption: caption[0],
    headRows: head[1].length,
    bodies: bodies.map((b) => ({
      attr: b[0],
      rowHeadColumns: b[1],
      headRows: b[2].length,
      bodyRows: b[3].length,
    })),
    footRows: foot[1].length,
    firstCellOf: (rows) => cellText(rows[0]),
    rawHead: head[1],
    rawBodies: bodies,
    rawFoot: foot[1],
  };
}

// --- Carve AST -> pandoc ----------------------------------------------------

test('an explicit partition reaches pandoc as head, two bodies and a foot', () => {
  const { doc, warnings } = carveAstToPandoc(tableAst(partition));
  const t = tableParts(doc);
  assert.deepEqual(warnings, []);
  assert.equal(t.headRows, 1);
  assert.deepEqual(
    t.bodies.map((b) => [b.rowHeadColumns, b.headRows, b.bodyRows]),
    [
      [1, 0, 1],
      [0, 1, 1],
    ],
  );
  assert.equal(t.footRows, 1);
  // The partition consumes `rows` in order: head, body 1, body 2 (its own
  // header row first), then the foot.
  assert.equal(t.firstCellOf(t.rawHead), 'Region');
  assert.equal(cellText(t.rawBodies[0][3][0]), 'North');
  assert.equal(cellText(t.rawBodies[1][2][0]), 'South region');
  assert.equal(cellText(t.rawBodies[1][3][0]), 'South');
  assert.equal(t.firstCellOf(t.rawFoot), 'All');
});

test('a body group carries its own attrs to the pandoc TableBody', () => {
  const groups = {
    headRows: 1,
    bodies: [
      { headRows: 0, bodyRows: 1, attrs: { id: 'north', classes: ['totals'], order: ['#id', '.class'] } },
      { headRows: 1, bodyRows: 1 },
    ],
    footRows: 1,
  };
  const { doc } = carveAstToPandoc(tableAst(groups));
  assert.deepEqual(tableParts(doc).bodies[0].attr, ['north', ['totals'], []]);
});

test('control: without the field the implicit head/body split is unchanged', () => {
  const { doc, warnings } = carveAstToPandoc(tableAst(null));
  const t = tableParts(doc);
  assert.deepEqual(warnings, []);
  assert.equal(t.headRows, 1);
  assert.deepEqual(
    t.bodies.map((b) => [b.rowHeadColumns, b.headRows, b.bodyRows]),
    [[0, 0, 4]],
  );
  assert.equal(t.footRows, 0);
});

test('a short caption survives on a table that also carries row groups', () => {
  const { doc } = carveAstToPandoc(tableAst(partition));
  assert.deepEqual(tableParts(doc).shortCaption, [{ t: 'Str', c: 'Totals' }]);
});

// --- The sum §15 requires ---------------------------------------------------

test('a partition whose counts do not sum is refused, with the numbers said out loud', () => {
  // Four of five rows. The schema accepts this document; the sum is the part
  // no schema can state.
  const short = {
    headRows: 1,
    bodies: [{ headRows: 0, bodyRows: 2 }],
    footRows: 1,
  };
  const { doc, warnings } = carveAstToPandoc(tableAst(short));
  assert.equal(warnings.length, 1, `expected one warning, got ${JSON.stringify(warnings)}`);
  assert.match(warnings[0], /partitions 4 row\(s\) but the table has 5/);
  assert.match(warnings[0], /implicit head\/body split/);
  // and the table is the implicit one rather than a table whose sections
  // disagree with its rows
  const t = tableParts(doc);
  assert.deepEqual(
    t.bodies.map((b) => [b.headRows, b.bodyRows]),
    [[0, 4]],
  );
  assert.equal(t.footRows, 0);
});

test('a partition that over-counts is refused the same way', () => {
  const long = { headRows: 1, bodies: [{ headRows: 0, bodyRows: 5 }], footRows: 1 };
  const { warnings } = carveAstToPandoc(tableAst(long));
  assert.match(warnings[0], /partitions 7 row\(s\) but the table has 5/);
});

test('a count that is not a count is refused before the sum is reached', () => {
  const bad = { headRows: 1, bodies: [{ headRows: 0, bodyRows: '3' }], footRows: 1 };
  const { warnings } = carveAstToPandoc(tableAst(bad));
  assert.match(warnings[0], /body 1 needs integer headRows and bodyRows/);
});

test('a rowspan may not cross a body-group boundary', () => {
  const ast = tableAst(partition);
  // The second body's header row covers the row above it - across the group
  // boundary, which pandoc's row lists cannot express.
  ast.children[0].rows[2].cells[0] = { type: 'table_cell', header: true, children: [], span: 'rowspan' };
  const { warnings } = carveAstToPandoc(ast);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /rowspan crossing the header\/body boundary at row 3, col 1/);
});

// --- pandoc -> Carve AST ----------------------------------------------------

const P = (s) => ({ t: 'Str', c: s });
const pCell = (s) => [['', [], []], { t: 'AlignDefault' }, 1, 1, [{ t: 'Plain', c: [P(s)] }]];
const pRow = (...ss) => [['', [], []], ss.map(pCell)];
const colspec = { t: 'AlignDefault' };

function pandocTable({ head, bodies, foot, shortCaption = null }) {
  return {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Table',
        c: [
          ['', [], []],
          [shortCaption, [{ t: 'Plain', c: [P('Quarterly')] }]],
          [
            [colspec, { t: 'ColWidthDefault' }],
            [colspec, { t: 'ColWidthDefault' }],
          ],
          [['', [], []], head],
          bodies,
          [['', [], []], foot],
        ],
      },
    ],
  };
}

const twoBodiesAndAFoot = pandocTable({
  head: [pRow('Region', 'Total')],
  bodies: [
    [['', [], []], 1, [], [pRow('North', '11')]],
    [['north-2', ['totals'], []], 0, [pRow('South region', 'Total')], [pRow('South', '22')]],
  ],
  foot: [pRow('All', '33')],
  shortCaption: [P('Totals')],
});

test('pandoc bodies, foot and row-head columns come back as counts', () => {
  const { ast } = pandocToCarveAst(twoBodiesAndAFoot);
  const table = ast.children[0];
  assert.equal(table.rows.length, 5, 'every row stays in the flat list');
  assert.deepEqual(table.rowGroups, {
    headRows: 1,
    bodies: [
      { headRows: 0, bodyRows: 1, rowHeadColumns: 1 },
      {
        headRows: 1,
        bodyRows: 1,
        attrs: { id: 'north-2', classes: ['totals'], order: ['#id', '.class'] },
      },
    ],
    footRows: 1,
  });
});

test("a body's intermediate header row is imported as header cells", () => {
  const { ast } = pandocToCarveAst(twoBodiesAndAFoot);
  assert.deepEqual(
    ast.children[0].rows.map((r) => r.cells.every((c) => c.header === true)),
    [true, false, true, false, false],
  );
});

test('the short caption survives alongside the counts', () => {
  const { ast } = pandocToCarveAst(twoBodiesAndAFoot);
  assert.deepEqual(ast.children[0].shortCaption, [{ type: 'text', value: 'Totals' }]);
});

test('control: an implicit pandoc table gets no rowGroups field at all', () => {
  const plain = pandocTable({
    head: [pRow('Region', 'Total')],
    bodies: [[['', [], []], 0, [], [pRow('North', '11')]]],
    foot: [],
  });
  const table = pandocToCarveAst(plain).ast.children[0];
  assert.equal(
    table.rowGroups,
    undefined,
    'absent means the structure every renderer derives; emitting it would add a field carrying nothing',
  );
});

test('the counts survive a full Carve AST -> pandoc -> Carve AST round trip', () => {
  const { doc } = carveAstToPandoc(tableAst(partition));
  const { ast } = pandocToCarveAst({ ...doc, meta: {} });
  const table = ast.children[0];
  assert.deepEqual(table.rowGroups, partition);
  assert.deepEqual(
    table.rows.map((r) => r.cells[0].children[0].value),
    ['Region', 'North', 'South region', 'South', 'All'],
  );
});

/*
 * The partition reaches the exchange AST intact - that is what the tests above
 * pin. The SOURCE writer is where it stops: a pipe table spells a leading run
 * of header rows and nothing else, so a foot, a second body, a body's own
 * header rows, its row-head columns and its attributes come out as ordinary
 * body rows. §15 asks for exactly this to be reported rather than dropped
 * quietly, and the pipe path used to be silent about all five while the
 * list-table path reported its own version of the same losses.
 */

test('the pipe writer reports what the partition says and the source cannot', () => {
  const { warnings } = pandocToCarve(twoBodiesAndAFoot);
  const said = warnings.filter((w) => w.startsWith('table: '));
  assert.equal(said.length, 1, `one warning naming everything: ${warnings.join(' | ')}`);
  for (const part of ['a foot of 1 row(s)', '2 body groups', "a body's intermediate header rows", 'row-head columns', "a body group's attributes"]) {
    assert.ok(said[0].includes(part), `${part} is named: ${said[0]}`);
  }
  assert.ok(said[0].includes('rowGroups'), 'and it says where the value does survive');
});

test('the AST path says the same thing, because the warning names where it survives', () => {
  // Both entry points run the same conversion, so the wording has to be true
  // on the path that loses NOTHING - hence "preserved in the Carve AST".
  const { ast, warnings } = pandocToCarveAst(twoBodiesAndAFoot);
  assert.ok(ast.children[0].rowGroups, 'nothing was lost here');
  assert.ok(warnings.some((w) => w.includes('preserved in the Carve AST')), warnings.join(' | '));
});

test('control: a flat table warns about nothing', () => {
  const plain = pandocTable({
    head: [pRow('Region', 'Total')],
    bodies: [[['', [], []], 0, [], [pRow('North', '11')]]],
    foot: [],
  });
  assert.deepEqual(pandocToCarve(plain).warnings, []);
});

/*
 * Carve spells COLUMN alignment on the header cell marker (`|=> Name |`). A
 * pandoc grid table may be headerless and still carry alignment, and that used
 * to vanish without a word: the alignment was copied onto header cells only,
 * and there were none.
 */

function alignedTable(withHeader) {
  const right = { t: 'AlignRight' };
  const doc = pandocTable({
    head: withHeader ? [pRow('Region', 'Total')] : [],
    bodies: [[['', [], []], 0, [], [pRow('North', '11')]]],
    foot: [],
  });
  doc.blocks[0].c[2] = [[right, { t: 'ColWidthDefault' }], [right, { t: 'ColWidthDefault' }]];
  return doc;
}

test('column alignment with no header row is written per cell, and the move is reported', () => {
  const { ast, warnings } = pandocToCarveAst(alignedTable(false));
  assert.deepEqual(
    ast.children[0].rows[0].cells.map((c) => c.align),
    ['right', 'right'],
    'the alignment survives on the only slot left',
  );
  assert.ok(
    warnings.some((w) => w.includes('no header row') && w.includes('each cell')),
    warnings.join(' | '),
  );
});

test('control: with a header row the alignment stays on the header, unreported', () => {
  const { ast, warnings } = pandocToCarveAst(alignedTable(true));
  const [head, body] = ast.children[0].rows;
  assert.deepEqual(head.cells.map((c) => c.align), ['right', 'right']);
  assert.deepEqual(
    body.cells.map((c) => c.align),
    [undefined, undefined],
    'a body cell inherits its column and needs no marker of its own',
  );
  assert.deepEqual(warnings, []);
});

test("a body's intermediate header row does not count as the column header", () => {
  // Measured on the engine: a `|=` row in the MIDDLE renders as
  // `<th scope="row">` and its alignment applies to that cell alone, while a
  // LEADING header row puts the alignment on every body cell under it. So a
  // table whose only header rows are intermediate is headerless for this
  // purpose, and treating it otherwise would leave the body unaligned with no
  // diagnostic.
  const right = { t: 'AlignRight' };
  const doc = pandocTable({
    head: [],
    bodies: [[['', [], []], 0, [pRow('Region', 'Total')], [pRow('North', '11')]]],
    foot: [],
  });
  doc.blocks[0].c[2] = [[right, { t: 'ColWidthDefault' }], [right, { t: 'ColWidthDefault' }]];

  const { ast, warnings } = pandocToCarveAst(doc);
  assert.deepEqual(
    ast.children[0].rows.map((r) => r.cells.map((c) => c.align)),
    [['right', 'right'], ['right', 'right']],
    'every cell carries it, the intermediate header included',
  );
  assert.ok(warnings.some((w) => w.includes('no header row')), warnings.join(' | '));
});
