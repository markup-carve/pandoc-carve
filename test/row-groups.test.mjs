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
import { carveAstToPandoc, carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

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

test('control: without the field the implicit split follows the rows themselves', () => {
  const { doc, warnings } = carveAstToPandoc(tableAst(null));
  const t = tableParts(doc);
  assert.deepEqual(warnings, []);
  assert.equal(t.headRows, 1);
  // ONE BODY PER RUN OF ROWS THAT AGREE ON THEIR LEADING HEADER CELLS.
  //
  // This asserted one body of four rows with no row heads, which was the old
  // rule showing through: the count was the MINIMUM leading run across every
  // body row, so row 3 - `South region | Total`, header cells throughout -
  // dragged the whole table to zero and its cells left as `<td>`. Silently.
  //
  // The fixture's four body rows are 0, 2, 0, 0 header-led, so they are three
  // runs and pandoc carries three bodies, each stating its own count. A table
  // whose body rows DO agree still produces exactly one body, which is what
  // this control was really guarding.
  assert.deepEqual(
    t.bodies.map((b) => [b.rowHeadColumns, b.headRows, b.bodyRows]),
    [
      [0, 0, 1],
      [2, 0, 1],
      [0, 0, 2],
    ],
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
    // The implicit split, which is three runs on this fixture - see the control
    // above. What matters here is that the refused partition contributed
    // nothing to it: no intermediate head rows, no foot.
    [
      [0, 1],
      [0, 1],
      [0, 2],
    ],
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

/**
 * The same partition with NO row-head columns.
 *
 * Row-head columns are the one thing in a partition that the source layer can
 * still spell, as a `::: list-table {header-cols=N}`, so a table carrying them
 * leaves the pipe form entirely. This fixture is what the pipe path looks like
 * when it has nothing left to save.
 */
const twoBodiesAndAFootFlatHeads = pandocTable({
  head: [pRow('Region', 'Total')],
  bodies: [
    [['', [], []], 0, [], [pRow('North', '11')]],
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

/*
 * THE `ast` TARGET STATES NOTHING, because it has nothing to state it on and
 * nothing to lose. The partition is exact in `rowGroups` there; adding
 * `header-rows` / `footer-rows` to the table's attrs would invent attributes the
 * pandoc table never carried and say the same thing twice, and the source
 * writer's merge diagnostic would describe a read-back that never happens.
 */
test('the ast target adds no partition attributes and no source diagnostic', () => {
  const { ast, warnings } = pandocToCarveAst(twoBodiesAndAFoot);
  assert.equal(ast.children[0].attrs, undefined);
  assert.ok(!warnings.some((w) => w.includes('disagree on how many leading cells')), warnings.join(' | '));
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
 * THE SOURCE WRITER STATES THE WHOLE PARTITION NOW, AND THE LOSS LIST IS EMPTY.
 *
 * This test pinned the opposite twice, each time correctly for its engine. It
 * first asserted that the second body and its intermediate header rows were NOT
 * reported, because a table with a foot left the pipe form for a
 * `::: list-table`. It then asserted that they WERE reported, because the foot
 * came back to the pipe form and the pipe writer of carve 0.1.8 spelled only
 * `header-rows` and `footer-rows`, so everything below them flattened into one
 * body.
 *
 * carve 0.1.10 writes PART 12 §15's positional keys, so there is nothing left
 * to report. Measured on this fixture: the pandoc input's bodies are
 * `[[0 row-head cols, 0 head rows, 1 data row], [0, 1, 1]]`, and reading the
 * emitted source back gives exactly those again, with the head and the foot in
 * place and no warning raised. The HTML carries one `tbody` per body, where the
 * attribute-free spelling carried one for both.
 */

test('the source writer states the whole partition, so it reports no loss', () => {
  const { carve, warnings } = pandocToCarve(twoBodiesAndAFootFlatHeads);
  assert.ok(!carve.includes('list-table'), `stayed a pipe table: ${carve}`);
  assert.equal(
    carve,
    '{header-rows=1 footer-rows=1 body-rows=1,1 body-header-rows=0,1}\n'
    + '|= Region |= Total |\n| North | 11 |\n|= South region |= Total |\n'
    + '| South | 22 |\n| All | 33 |\n^ Quarterly\n',
  );
  // The partition is not on the list any more. What is left is the two things
  // Carve source genuinely cannot spell: a body group's attributes and the
  // short caption.
  assert.ok(warnings.some((warning) => warning.includes("body group's attributes")), warnings.join(' | '));
  assert.ok(warnings.some((warning) => warning.includes('short caption')), warnings.join(' | '));
  assert.ok(!warnings.some((warning) => warning.includes('body groups')), warnings.join(' | '));
  assert.ok(!warnings.some((warning) => warning.includes('intermediate header')), warnings.join(' | '));
  assert.ok(!warnings.some((warning) => warning.includes('a foot of')), warnings.join(' | '));
  // AND THE PARTITION ITSELF COMES BACK, which is why the warnings went: the
  // writer's claim is checked against a read-back, not taken on its word.
  const table = carveToPandoc(carve).doc.blocks[0];
  assert.deepEqual(table.c[4].map((b) => [b[1], b[2].length, b[3].length]), [[0, 0, 1], [0, 1, 1]]);
  assert.equal(table.c[3][1].length, 1, 'the head');
  assert.equal(table.c[5][1].length, 1, 'the foot');
});

/** Row heads, one body, no foot: the shape the pipe table spells completely. */
const rowHeadsOnly = pandocTable({
  head: [pRow('Region', 'Total')],
  bodies: [[['', [], []], 1, [], [pRow('North', '11')]]],
  foot: [],
});

/** The same, plus a foot, which the pipe table states on its attribute line. */
const rowHeadsAndAFoot = pandocTable({
  head: [pRow('Region', 'Total')],
  bodies: [[['', [], []], 1, [], [pRow('North', '11')]]],
  foot: [pRow('All', '33')],
});

/*
 * ROW-HEAD COLUMNS ARE SPELLED BY THE PIPE TABLE ITSELF.
 *
 * `RowHeadColumns` says the leading N cells of every body row are row headers,
 * and a pipe table says that per cell: `|= Mercury | 4,879.4 |` is a row header
 * (`<th scope="row">`), measured on the engine. This briefly went out through a
 * `::: list-table {header-cols=N}` instead, on the belief that the pipe form
 * could not spell it - more markup, an extension the reader has to enable, and
 * one number for the whole table where the cells can each say it.
 *
 * Marking the cells round-trips, because the forward direction derives the
 * count back from exactly that leading run.
 */

test('row-head columns are marked on the cells and stay a pipe table', () => {
  const { carve } = pandocToCarve(rowHeadsOnly);
  assert.ok(!carve.includes('list-table'), `stayed a pipe table: ${carve}`);
  assert.equal(carve, '|= Region |= Total |\n|= North | 11 |\n^ Quarterly\n');
});

test('and pandoc gets its RowHeadColumns back from those cells', () => {
  const { carve } = pandocToCarve(rowHeadsOnly);
  assert.equal(carveToPandoc(carve).doc.blocks[0].c[4][0][1], 1);
});

/*
 * A FOOT USED TO LEAVE THE PIPE FORM, AND AT THE TIME IT HAD TO.
 *
 * This test was `a foot uses ListTable footer-rows and round-trips as a foot`,
 * and it pinned `::: list-table {footer-rows=1}` - the writer left the pipe form
 * for any table with a foot. That was not a preference. Measured on the two
 * engines either side of it, on the same source:
 *
 *     {header-rows=1 footer-rows=1}
 *     |= Region |= Total |
 *     |= North | 11 |
 *     | All | 33 |
 *
 * carve-js 0.1.3, the pin in force when the clause was written, produced no
 * `rowGroups` and leaked the keys as literal HTML attributes -
 * `<table header-rows="1" footer-rows="1">`, every row in one `<tbody>`. The
 * spelling reached the spec the day AFTER (corpus 376), so the list-table was
 * the only form that could carry a foot at all.
 *
 * carve-js 0.1.4 reads the same source as
 * `{headRows: 1, bodies: [{headRows: 0, bodyRows: 1}], footRows: 1}` and renders
 * a real `<tfoot>`. So the test keeps its subject and its numbers - a foot of one
 * row, arriving beside row-head columns - and changes the form it expects.
 */
test('a foot is stated on the pipe table and round-trips as a foot', () => {
  const { carve, warnings } = pandocToCarve(rowHeadsAndAFoot);
  assert.ok(!carve.includes('list-table'), `stayed a pipe table: ${carve}`);
  assert.equal(carve, '{header-rows=1 footer-rows=1}\n|= Region |= Total |\n|= North | 11 |\n| All | 33 |\n^ Quarterly\n');
  assert.ok(!warnings.some((w) => w.includes('a foot of')), warnings.join(' | '));
  const table = carveToPandoc(carve).doc.blocks[0];
  assert.equal(table.c[4][0][1], 1, carve);
  assert.equal(table.c[5][1].length, 1, carve);
});

/*
 * THE HEAD IS STATED ALONGSIDE THE FOOT BECAUSE IT HAS TO BE. Measured: the
 * counts are read as the whole partition rather than as a correction to the one
 * the `|=` markers imply, so `{footer-rows=1}` on its own moves the header row
 * into the body and its cells come back `<th scope="row">`.
 */
test('and the head is stated with it, or the attribute line would eat the head', () => {
  const { carve } = pandocToCarve(rowHeadsAndAFoot);
  assert.match(carve, /^\{header-rows=1 footer-rows=1\}$/m, carve);
  assert.equal(carveToPandoc(carve).doc.blocks[0].c[3][1].length, 1, carve);
});

/*
 * A DECLARED PARTITION STILL READS THE ROW HEADERS OFF THE CELLS. This is the
 * defect corpus 376 was parked on once the foot came back: the forward direction
 * derived `RowHeadColumns` only when NOTHING declared a partition, so a table
 * that stated its foot lost every `|= North | 11 |` in silence while the same
 * table without the foot kept them.
 */
test('a stated partition does not swallow the row headers under it', () => {
  const carve = '{header-rows=1 footer-rows=1}\n|= Region |= Total |\n|= North | 11 |\n| All | 33 |\n';
  const table = carveToPandoc(carve).doc.blocks[0];
  assert.equal(table.c[4][0][1], 1, 'RowHeadColumns comes off the marked cells');
  assert.equal(table.c[3][1].length, 1);
  assert.equal(table.c[5][1].length, 1);
});

/*
 * THE STRAY-ROW-HEADER REPORT REACHES A DECLARED PARTITION TOO. It used to sit
 * inside the branch that runs when NOTHING declared a partition, where no foot
 * can exist - so a table that stated its foot reached none of it, and the
 * declared path had just started deriving row headers, which is what makes the
 * cells that cannot be derived worth naming.
 */
test('a stray row header under a stated partition is reported, not dropped quietly', () => {
  const carve = '{header-rows=1 footer-rows=1}\n|= Region |= Total |\n| North |= 11 |\n| All | 33 |\n';
  const { warnings } = carveToPandoc(carve);
  assert.ok(
    warnings.some((w) => w.includes('a row header outside the leading run is dropped')),
    warnings.join(' | '),
  );
});

/*
 * AND A FOOT ROW HAS NO ROW-HEAD SLOT AT ALL. `TableFoot` is a bare list of rows
 * with no `RowHeadColumns` (src/pandoc.ts `Table`), so even a LEADING `|=` in a
 * foot row has nowhere to go - a case that could not arise while a foot never
 * reached the pipe path.
 */
test('and a row header in the foot is reported, because a foot has no slot for one', () => {
  const carve = '{header-rows=1 footer-rows=1}\n|= Region |= Total |\n| North | 11 |\n|= All | 33 |\n';
  const { warnings } = carveToPandoc(carve);
  assert.ok(
    warnings.some((w) => w.includes("a foot row's row header is dropped")
      && w.includes('no RowHeadColumns')),
    warnings.join(' | '),
  );
});

/*
 * STATING THE FOOT NO LONGER COLLAPSES THE BODIES INTO ONE.
 *
 * A partition stated as `{header-rows=N footer-rows=M}` alone was one body, and
 * one body carries one row-header count, so bodies that disagreed on their
 * leading `|=` run lost their scope - the writer reported that merge because it
 * was the only side that still knew the runs. `body-rows` and
 * `body-header-cols` state the split and the per-body counts, so there is no
 * merge and no cost. Measured: in goes `[1, 0]`, out comes `[1, 0]`.
 */
const rowHeadsDisagreeingUnderAFoot = pandocTable({
  head: [pRow('Region', 'Total')],
  bodies: [
    [['', [], []], 1, [], [pRow('North', '11')]],
    [['', [], []], 0, [], [pRow('South', '22')]],
  ],
  foot: [pRow('All', '33')],
});

test('a foot over disagreeing row-head runs keeps both counts and reports nothing', () => {
  const { carve, warnings } = pandocToCarve(rowHeadsDisagreeingUnderAFoot);
  assert.equal(
    carve,
    '{header-rows=1 footer-rows=1 body-rows=1,1 body-header-cols=1,}\n'
    + '|= Region |= Total |\n|= North | 11 |\n| South | 22 |\n| All | 33 |\n^ Quarterly\n',
  );
  assert.deepEqual(warnings, [], warnings.join(' | '));
  assert.deepEqual(carveToPandoc(carve).doc.blocks[0].c[4].map((b) => b[1]), [1, 0], carve);
});

test('control: runs that agree under a foot are not reported and are not lost', () => {
  const { carve, warnings } = pandocToCarve(rowHeadsAndAFoot);
  assert.ok(!warnings.some((w) => w.includes('disagree')), warnings.join(' | '));
  assert.equal(carveToPandoc(carve).doc.blocks[0].c[4][0][1], 1, carve);
});

/*
 * A STALE COUNT ON AN INCOMING `Attr` MUST NOT OUTRANK THE ROWS. The forward
 * direction filters its own copies of these keys out, but a pandoc document that
 * arrived from anywhere else can carry them, and the pipe writer states the
 * partition through the same keys. Measured before the fix: a table with a head,
 * two body rows and NO foot, whose `Attr` said `footer-rows=1`, was written
 * `{footer-rows=1}` above the pipe rows and came back head 0, foot 1.
 */
const staleFooterKey = (() => {
  const table = pandocTable({
    head: [pRow('Region', 'Total')],
    bodies: [[['', [], []], 0, [], [pRow('North', '11'), pRow('South', '22')]]],
    foot: [],
  });
  table.blocks[0].c[0] = ['', [], [['footer-rows', '1']]];
  return table;
})();

test('a partition key on the incoming attr is replaced by the rows, not kept', () => {
  const { carve } = pandocToCarve(staleFooterKey);
  assert.ok(!carve.includes('footer-rows'), carve);
  const table = carveToPandoc(carve).doc.blocks[0];
  assert.equal(table.c[3][1].length, 1, `the head survives: ${carve}`);
  assert.equal(table.c[5][1].length, 0, `and no foot is invented: ${carve}`);
});

/*
 * The counts ARE the partition, so they must not also be an attribute. They used
 * to arrive as both: `header-rows` and `footer-rows` were read into `rowGroups`
 * AND left on the pandoc `Attr`, which put a stray attribute on the table in
 * every pandoc writer. The list-table reader already filtered its own copies.
 */
test('the stated counts do not survive as pandoc table attributes as well', () => {
  const carve = '{header-rows=1 footer-rows=1}\n|= Region |= Total |\n| North | 11 |\n| All | 33 |\n';
  assert.deepEqual(carveToPandoc(carve).doc.blocks[0].c[0], ['', [], []]);
});

test('and a body whose rows disagree reports it instead of picking a count', () => {
  // A declared body cannot be split the way a derived one is - splitting would
  // contradict the count that was stated - so there is no number every row asked
  // for, and saying so is the whole of what can be done.
  const carve = '{header-rows=1 footer-rows=1}\n|= Region |= Total |\n|= North | 11 |\n| South | 22 |\n| All | 33 |\n';
  const { warnings } = carveToPandoc(carve);
  assert.ok(
    warnings.some((w) => w.includes('disagree on how many leading cells are row headers')),
    warnings.join(' | '),
  );
  assert.equal(carveToPandoc(carve).doc.blocks[0].c[4][0][1], 0);
});

test('a row-head row below a plain one keeps its scope through the round trip', () => {
  // Corpus 354-2, the smallest case of the run split, and the one that made the
  // whole-corpus round trip red: a plain row, then a row whose only cell is a
  // row header. Under one body and a minimum, the two rows disagreed, the count
  // went to zero, and `<th scope="row">` came back `<td>`.
  //
  // `|= b |`, with the space: corpus 256 "table cell padding must be a space"
  // makes the kind marker a marker only when a space follows it, so the glued
  // `|=b |` this used to spell is a data cell whose content is the literal
  // `=b`. Measured on the engine, the glued form renders `<td>=b c</td>` and
  // the spaced one `<th scope="row">b c</th>`. The assertions are unchanged -
  // the row-head run is still what is being pinned.
  const src = '| a |\n|= b |\n+ c |\n';
  const bodies = carveToPandoc(src).doc.blocks[0].c[4];
  assert.deepEqual(bodies.map((b) => [b[1], b[3].length]), [[0, 1], [1, 1]]);
  const { carve } = pandocToCarve(carveToPandoc(src, { roundtrip: true }).doc);
  assert.equal(carve, '| a |\n|= b c |\n');
  // AND NO ATTRIBUTE LINE, which carve 0.1.10 made a live question. Those two
  // pandoc bodies are the forward direction's ENCODING of the row-head runs -
  // pandoc has no per-row count - not a partition this source wrote, and the
  // writer now spells `body-rows` for any multi-body group it is handed. Stating
  // them turns the source's one `<tbody>` into two. The markers carry the scope
  // on their own, which is what the read-back below measures.
  assert.deepEqual(
    carveToPandoc(carve).doc.blocks[0].c[4].map((b) => [b[1], b[3].length]),
    [[0, 1], [1, 1]],
  );
});

/*
 * THE COLLAPSE ABOVE IS NARROW, and these two cases say where its edges are.
 * It exists because the forward direction splits one Carve body at every change
 * in the row-head run, so the bodies it produces can be an encoding of the
 * cells rather than a partition the input carried. Both of the following are
 * partitions, and each was silently flattened by a wider first cut.
 *
 * Built by taking a real pandoc table apart rather than from the fixture
 * helper, which fixes two columns and a caption; one column is what makes the
 * second case reachable at all.
 */

test('two bodies that agree on their row-head count keep their boundary', () => {
  // Nothing here could have come from the run-change rule: the runs are equal.
  // Collapsing it merged two sections into one `<tbody>` for nothing.
  const doc = carveToPandoc('| a |\n| b |\n').doc;
  const rows = doc.blocks[0].c[4][0][3];
  doc.blocks[0].c[4] = [
    [['', [], []], 0, [], [rows[0]]],
    [['', [], []], 0, [], [rows[1]]],
  ];
  const { carve } = pandocToCarve(doc);
  assert.equal(carve, '{body-rows=1,1}\n| a |\n| b |\n');
  assert.deepEqual(
    carveToPandoc(carve).doc.blocks[0].c[4].map((b) => [b[1], b[3].length]),
    [[0, 1], [0, 1]],
  );
});

test('a row-head count that covers every column is stated, not left to the cells', () => {
  // The count is derivable from the markers only while some cell in the row is
  // NOT marked. Mark them all and the row reads as a header ROW: measured, a
  // one-column body of two rows at `RowHeadColumns = 1` came back as a two-row
  // `TableHead` over an empty body.
  const doc = carveToPandoc('| a |\n| b |\n').doc;
  doc.blocks[0].c[4][0][1] = 1;
  const { carve } = pandocToCarve(doc);
  assert.equal(carve, '{body-rows=2 body-header-cols=1}\n|= a |\n|= b |\n');
  const table = carveToPandoc(carve).doc.blocks[0];
  assert.equal(table.c[3][1].length, 0, 'no head was invented');
  assert.deepEqual(table.c[4].map((b) => [b[1], b[3].length]), [[1, 2]]);
});

/**
 * A pandoc table of one row per body, with the row-head count of each body
 * given. `nCols` decides whether a marked row fills its row, which is the whole
 * question in two of the cases below.
 */
function bodiesWithRowHeadCounts(counts, nCols) {
  const src = counts
    .map((_, i) => `| ${String.fromCharCode(97 + i)}${nCols > 1 ? ' | x' : ''} |`)
    .join('\n') + '\n';
  const doc = carveToPandoc(src).doc;
  const rows = doc.blocks[0].c[4][0][3];
  doc.blocks[0].c[4] = counts.map((count, i) => [['', [], []], count, [], [rows[i]]]);
  return doc;
}

test('a leading row-head run that fills the row is stated, or it becomes the head', () => {
  // One column, counts [1, 0]. Collapsed, this emits `|= a |` over `| b |`, and
  // a LEADING run of fully marked rows is the table head - so `a` came back a
  // column header. Only the first body can do this, which is why corpus 354
  // (counts [0, 1], one column) still collapses.
  const { carve } = pandocToCarve(bodiesWithRowHeadCounts([1, 0], 1));
  assert.equal(carve, '{body-rows=1,1 body-header-cols=1,}\n|= a |\n| b |\n');
  const table = carveToPandoc(carve).doc.blocks[0];
  assert.equal(table.c[3][1].length, 0, 'no head was invented');
  assert.deepEqual(table.c[4].map((b) => [b[1], b[3].length]), [[1, 1], [0, 1]]);
});

test('equal counts side by side are a boundary no run change could have made', () => {
  // Counts [1, 1, 0]. The forward direction splits at every CHANGE, so it never
  // puts two equal counts next to each other - that first boundary came from the
  // input. Collapsing on "some count differs" merged it away.
  const { carve } = pandocToCarve(bodiesWithRowHeadCounts([1, 1, 0], 2));
  assert.equal(
    carve,
    '{body-rows=1,1,1 body-header-cols=1,1,}\n|= a | x |\n|= b | x |\n| c | x |\n',
  );
  assert.deepEqual(
    carveToPandoc(carve).doc.blocks[0].c[4].map((b) => [b[1], b[3].length]),
    [[1, 1], [1, 1], [0, 1]],
  );
});

test('control: counts that alternate over more than one column still collapse', () => {
  const { carve } = pandocToCarve(bodiesWithRowHeadCounts([1, 0], 2));
  assert.equal(carve, '|= a | x |\n| b | x |\n');
  assert.deepEqual(
    carveToPandoc(carve).doc.blocks[0].c[4].map((b) => [b[1], b[3].length]),
    [[1, 1], [0, 1]],
  );
});

test('an empty body is stated, because no run change can produce one', () => {
  // The splitter cuts a run of DATA rows, so an empty body came from the input.
  // Collapsed, `[0 (empty), 2]` over two columns emitted the single data row
  // fully marked, and a leading fully marked row is the head - so the row became
  // a column header and the empty body vanished, both without a warning.
  const doc = carveToPandoc('| a | x |\n').doc;
  const rows = doc.blocks[0].c[4][0][3];
  doc.blocks[0].c[4] = [
    [['', [], []], 0, [], []],
    [['', [], []], 2, [], [rows[0]]],
  ];
  const { carve } = pandocToCarve(doc);
  assert.equal(carve, '{body-rows=0,1 body-header-cols=,2}\n|= a |= x |\n');
  const table = carveToPandoc(carve).doc.blocks[0];
  assert.equal(table.c[3][1].length, 0, 'no head was invented');
  assert.deepEqual(table.c[4].map((b) => [b[1], b[3].length]), [[0, 0], [2, 1]]);
});

test('and the AST target keeps the boundary the source writer normalizes away', () => {
  // The collapse is a choice the PIPE FORM forces: it cannot tell a derived
  // split from an authored one. `rowGroups` can, so the exchange AST keeps what
  // the pandoc table carried and nothing is normalized there.
  const table = pandocToCarveAst(bodiesWithRowHeadCounts([1, 0], 2)).ast.children[0];
  assert.deepEqual(table.rowGroups, {
    headRows: 0,
    bodies: [{ headRows: 0, bodyRows: 1, rowHeadColumns: 1 }, { headRows: 0, bodyRows: 1 }],
    footRows: 0,
  });
});

test('a row-head cell does not carry the column alignment', () => {
  // A header ROW's cells carry the column; a row-head cell is not a header row,
  // so its marker aligns itself alone - which is what the engine does.
  const doc = pandocTable({
    head: [],
    bodies: [[['', [], []], 1, [], [pRow('a', 'b')]]],
    foot: [],
  });
  doc.blocks[0].c[2] = [[{ t: 'AlignRight' }, { t: 'ColWidthDefault' }],
                        [{ t: 'AlignRight' }, { t: 'ColWidthDefault' }]];
  const { carve } = pandocToCarve(doc);
  assert.ok(!carve.includes('list-table'), carve);
  assert.equal(carveToPandoc(carve).doc.blocks[0].c[4][0][1], 1, carve);
});

test('the AST path keeps the table node, because rowGroups loses nothing there', () => {
  const table = pandocToCarveAst(twoBodiesAndAFoot).ast.children[0];
  assert.equal(table.type, 'table');
  assert.equal(table.rowGroups.bodies[0].rowHeadColumns, 1);
});

/*
 * `header-cols` is ONE number for the whole table. A table whose bodies
 * disagree - and `1` beside a plain `0` is the ordinary way they disagree -
 * would come back with row headers ADDED to the rows that had none, which is a
 * worse outcome than the flattening the switch was meant to avoid: dropping a
 * row header renders a `td` where a `th` belonged, inventing one asserts a
 * heading the source never made.
 */

const disagreeingRowHeads = pandocTable({
  head: [],
  bodies: [
    [['', [], []], 1, [], [pRow('a', 'b')]],
    [['', [], []], 0, [], [pRow('c', 'd')]],
  ],
  foot: [],
});

test('bodies that disagree on row-head columns keep the pipe form', () => {
  const { carve, warnings } = pandocToCarve(disagreeingRowHeads);
  assert.ok(!carve.includes('list-table'), `stayed a pipe table: ${carve}`);
  assert.ok(!carve.includes('header-cols'), 'and invented no row headers');
  assert.equal(carve, '|= a | b |\n| c | d |\n^ Quarterly\n');
  // AND NO `body-rows` EITHER. These two bodies exist only to give the two
  // row-head runs somewhere to live in pandoc's model, so stating them would
  // invent a `tbody` boundary - see the note beside `onlyRowHeadRuns`. Nothing
  // is lost by leaving them out, so nothing is reported.
  assert.deepEqual(warnings, [], `nothing is lost, so nothing is named: ${warnings.join(' | ')}`);
  // AND THE ROW HEADS THEMSELVES ARE NOT LOST - measured here rather than
  // asserted from the writer's side.
  assert.deepEqual(
    carveToPandoc(carve).doc.blocks[0].c[4].map((body) => body[1]),
    [1, 0],
  );
});

test('a forced list-table reports the row headers the disagreement invents', () => {
  // Block cells leave no choice of representation, so the widening happens and
  // has to be named. A zero is a disagreement: the check used to filter zeros
  // out, which made the one case that CHANGES the markup the one that was mute.
  const withBlockCell = pandocTable({
    head: [],
    bodies: [
      [['', [], []], 1, [], [[['', [], []], [
        [['', [], []], { t: 'AlignDefault' }, 1, 1, [{ t: 'Para', c: [P('a')] }, { t: 'Para', c: [P('a2')] }]],
        pCell('b'),
      ]]]],
      [['', [], []], 0, [], [pRow('c', 'd')]],
    ],
    foot: [],
  });
  const { warnings } = pandocToCarve(withBlockCell);
  assert.ok(
    warnings.some((w) => w.includes('disagree on their row-head column count')
      && w.includes('gain row headers')),
    `the widening is named: ${warnings.join(' | ')}`,
  );
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

test('column alignment with no header row lives in column records without a warning', () => {
  const { ast, warnings } = pandocToCarveAst(alignedTable(false));
  assert.deepEqual(
    ast.children[0].columns.map((c) => c.align),
    ['right', 'right'],
    'the alignment survives in the column records',
  );
  assert.deepEqual(warnings, []);
});

test('control: with a header row the alignment stays on the header, unreported', () => {
  const { ast, warnings } = pandocToCarveAst(alignedTable(true));
  assert.deepEqual(ast.children[0].columns.map((c) => c.align), ['right', 'right']);
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
    ast.children[0].columns.map((c) => c.align),
    ['right', 'right'],
    'the columns carry it independently of intermediate header rows',
  );
  assert.deepEqual(warnings, []);
});
