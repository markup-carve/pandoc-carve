import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { parse } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc } from './helpers.mjs';

const pandoc = findPandoc();

/*
 * Real docx and LaTeX tables hold lists and paragraphs in cells. PART 9 §16's
 * pipe-table cell holds INLINES, so there is no pipe form for that, and what
 * the bridge did was not a degradation but a loss. Measured on a pandoc grid
 * table before this file existed:
 *
 *   - a `BulletList` cell emitted NOTHING while the warning said "flattened to
 *     text" - `stringifyBlocks` walks `{t, c}` nodes and a list's `c` is a list
 *     of block LISTS, so nothing matched;
 *   - a two-paragraph cell put a literal newline inside the pipe row, and the
 *     two-row table re-parsed as a ONE-row table plus a stray paragraph.
 *
 * Decision D4(b): emit `::: list-table` (extensions.md §5), whose cells are
 * list items and therefore hold full block content.
 */

const GRID = `+------+---------------+
| a    | - one
|      | - two
+------+---------------+
| b    | para one
|      |
|      | para two
+------+---------------+

Table: A caption
`;

const read = (source, from) =>
  JSON.parse(execFileSync(pandoc, ['-f', from, '-t', 'json'], { input: source, encoding: 'utf8' }));

const RICH_HTML = `<table>
<caption>Cap</caption>
<thead><tr><th>H1</th><th>H2</th></tr></thead>
<tbody>
<tr><td rowspan="2">spanning</td><td><ul><li>x</li><li>y</li></ul></td></tr>
<tr><td>plain</td></tr>
</tbody>
<tfoot><tr><td>f1</td><td>f2</td></tr></tfoot>
</table>`;

test('block cells: a table with block content becomes a list-table', { skip: !pandoc && 'pandoc not found' }, () => {
  const { ast, warnings } = pandocToCarveAst(read(GRID, 'markdown'));
  const [node] = ast.children;
  assert.equal(node.type, 'admonition');
  assert.equal(node.kind, 'list-table');
  assert.deepEqual(node.title, [{ type: 'text', value: 'A caption' }], 'the caption is the quoted title');

  const rows = node.children[0].items;
  assert.equal(rows.length, 2, 'both rows survive');
  const [, listCell] = rows[0].children[0].items;
  assert.equal(listCell.children[0].type, 'list', 'the bullet list is a list, not lost text');
  assert.deepEqual(
    listCell.children[0].items.map((i) => i.children[0].children[0].value),
    ['one', 'two'],
  );
  const [, twoParaCell] = rows[1].children[0].items;
  assert.deepEqual(twoParaCell.children.map((b) => b.type), ['paragraph', 'paragraph']);

  assert.ok(
    warnings.some((w) => w.includes('a cell holds block content')),
    warnings.join(' | '),
  );
  assert.ok(
    !warnings.some((w) => w.includes('flattened to text')),
    `the old warning must not fire on this path: ${warnings.join(' | ')}`,
  );
});

test('block cells: the emitted source re-parses as a list-table, not a broken table', { skip: !pandoc && 'pandoc not found' }, () => {
  const { carve } = pandocToCarve(read(GRID, 'markdown'));
  const reparsed = parse(carve);
  assert.deepEqual(
    reparsed.children.map((c) => `${c.type}${c.kind ? `:${c.kind}` : ''}`),
    ['admonition:list-table'],
    `one block, no stray paragraph:\n${carve}`,
  );
});

test('block cells: the block content survives the whole loop back to pandoc', { skip: !pandoc && 'pandoc not found' }, () => {
  const { carve } = pandocToCarve(read(GRID, 'markdown'));
  const { doc } = carveToPandoc(carve, { listTable: true });
  assert.equal(doc.blocks[0].t, 'Table');
  const bodyRows = doc.blocks[0].c[4][0][3];
  assert.deepEqual(
    bodyRows.map((r) => r[1].map((c) => c[4].map((b) => b.t))),
    [[['Para'], ['BulletList']], [['Para'], ['Para', 'Para']]],
    'the list is a list again and the two paragraphs are still two',
  );
});

test('block cells: head rows, row spans and the caption all cross', { skip: !pandoc && 'pandoc not found' }, () => {
  const { ast } = pandocToCarveAst(read(RICH_HTML, 'html'));
  const [node] = ast.children;
  assert.equal(node.attrs.keyValues['header-rows'], '1');
  const rows = node.children[0].items;
  assert.equal(rows.length, 4, 'head row, two body rows, foot row');
  const covered = rows[2].children[0].items[0];
  assert.deepEqual(
    covered.children[0].children.map((x) => x.value),
    ['^'],
    'the covered position is the rowspan marker §5.1 defines',
  );

  const { doc } = carveToPandoc(pandocToCarve(read(RICH_HTML, 'html')).carve, { listTable: true });
  const cell = doc.blocks[0].c[4][0][3][0][1][0];
  assert.equal(cell[2], 2, 'rowSpan restored');
  assert.deepEqual(doc.blocks[0].c[3][1].length, 1, 'the head row is still a head row');
  assert.equal(doc.blocks[0].c[1][1][0].c[0].c, 'Cap', 'caption restored');
});

test('block cells: list-table spells its foot explicitly', { skip: !pandoc && 'pandoc not found' }, () => {
  const { ast, warnings } = pandocToCarveAst(read(RICH_HTML, 'html'));
  assert.equal(ast.children[0].attrs.keyValues['footer-rows'], '1');
  assert.ok(!warnings.some((w) => w.includes('foot row(s)')), warnings.join(' | '));
});

test('block cells: list-table carries per-column alignment', { skip: !pandoc && 'pandoc not found' }, () => {
  // A grid table, because a pipe table's cell keeps `- one` inline: the
  // alignment lives on the colspec and the block content needs the grid form.
  const aligned = `+:-------+---------------:+
| head   | other          |
+:=======+===============:+
| a      | - one
|        | - two
+--------+----------------+
`;
  const { ast, warnings } = pandocToCarveAst(read(aligned, 'markdown'));
  assert.equal(ast.children[0].attrs.keyValues.aligns, ',right');
  assert.ok(!warnings.some((w) => w.includes('alignment')), warnings.join(' | '));
});

test('block cells: a body group\'s intermediate header rows are reported', () => {
  // Hand-built: pandoc's readers rarely produce an intermediate header, but its
  // model has one and `rowGroups` carries it. `header-rows` counts only the
  // leading run, so an intermediate header cannot be spelled.
  const cell = (blocks) => [['', [], []], { t: 'AlignDefault' }, 1, 1, blocks];
  const row = (blocks) => [['', [], []], [cell(blocks)]];
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Table',
        c: [
          ['', [], []],
          [null, []],
          [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]],
          [['', [], []], []],
          [
            [
              ['', [], []],
              0,
              [row([{ t: 'Plain', c: [{ t: 'Str', c: 'mid' }] }])],
              [row([{ t: 'BulletList', c: [[{ t: 'Plain', c: [{ t: 'Str', c: 'x' }] }]] }])],
            ],
          ],
          [['', [], []], []],
        ],
      },
    ],
  };
  const { warnings, ast } = pandocToCarveAst(doc);
  assert.equal(ast.children[0].kind, 'list-table');
  assert.ok(
    warnings.some((w) => w.includes('intermediate header rows become ordinary body rows')),
    warnings.join(' | '),
  );
});

test('block cells: an all-inline table is still a pipe table', { skip: !pandoc && 'pandoc not found' }, () => {
  // The control: nothing about the ordinary path changes, and no diagnostic
  // fires for a table that never needed one.
  const { ast, warnings } = pandocToCarveAst(read('| a | b |\n|---|---|\n| x | y |\n', 'markdown'));
  assert.equal(ast.children[0].type, 'table');
  assert.deepEqual(warnings, []);
});

test('block cells: an empty cell alongside a block cell stays empty', { skip: !pandoc && 'pandoc not found' }, () => {
  const src = `+---+--------+
|   | - one  |
+---+--------+
`;
  const { ast } = pandocToCarveAst(read(src, 'markdown'));
  const [empty] = ast.children[0].children[0].items[0].children[0].items;
  assert.deepEqual(empty.children, [{ type: 'paragraph', children: [] }]);
});

test('block cells: two paragraphs alone are enough, with no list anywhere', { skip: !pandoc && 'pandoc not found' }, () => {
  // The other fixtures pair a two-paragraph cell with a list cell, so the list
  // alone would carry them. This one has no list: the joining soft break of the
  // old path serialized as a literal newline inside the pipe row, which is what
  // split the table, so a multi-block cell must trip the branch on its own.
  const src = `+------+-----------+
| a    | para one
|      |
|      | para two
+------+-----------+
`;
  const { ast, warnings } = pandocToCarveAst(read(src, 'markdown'));
  assert.equal(ast.children[0].kind, 'list-table');
  assert.ok(warnings.some((w) => w.includes('a cell holds block content')), warnings.join(' | '));

  const { carve } = pandocToCarve(read(src, 'markdown'));
  assert.deepEqual(
    parse(carve).children.map((c) => c.type),
    ['admonition'],
    `no stray paragraph:\n${carve}`,
  );
});

test('block cells: the emitted tight flags match what the emitted source parses to', { skip: !pandoc && 'pandoc not found' }, () => {
  // `tight` is an AST field, not a formatting preference: fmt writes `+`
  // continuations for a tight item and a blank line for a loose one, and both
  // re-parse to the same blocks but NOT to the same flag. Claiming a cell of
  // two paragraphs is tight makes the emitted tree disagree with its own source.
  const { ast } = pandocToCarveAst(read(GRID, 'markdown'));
  const { carve } = pandocToCarve(read(GRID, 'markdown'));

  const flags = (node) => {
    const out = [];
    const walk = (n) => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (!n || typeof n !== 'object') return;
      if (n.type === 'list') out.push(n.tight);
      if (n.items) walk(n.items);
      if (n.children) walk(n.children);
    };
    walk(node);
    return out;
  };

  assert.deepEqual(flags(ast.children[0]), flags(parse(carve).children[0]));
  assert.ok(flags(ast.children[0]).includes(false), 'the two-paragraph cell is loose');
});

test('block cells: row-head columns survive the list-table loop', { skip: !pandoc && 'pandoc not found' }, () => {
  // `header-cols` is a real list-table key (extensions.md §5.1) and pandoc's
  // `RowHeadColumns` is the same thing. The reader ignored it, so the key was
  // emitted, left behind as an ordinary table attribute, and the row-header
  // semantics were lost on the way back.
  const doc = read('<table><tbody><tr><th>rh</th><td><ul><li>x</li></ul></td></tr></tbody></table>', 'html');
  assert.equal(doc.blocks[0].c[4][0][1], 1, 'the premise: pandoc recorded one row-head column');

  const { carve } = pandocToCarve(doc);
  assert.ok(carve.includes('{header-cols=1}'), carve);

  const { doc: back } = carveToPandoc(carve, { listTable: true });
  assert.equal(back.blocks[0].c[4][0][1], 1, 'restored as RowHeadColumns');
  assert.deepEqual(back.blocks[0].c[0], ['', [], []], 'and not left behind as a table attribute');
});

test('block cells: merged body groups and their attributes are reported', () => {
  const cell = (bs) => [['', [], []], { t: 'AlignDefault' }, 1, 1, bs];
  const row = (bs) => [['', [], []], [cell(bs)]];
  const list = { t: 'BulletList', c: [[{ t: 'Plain', c: [{ t: 'Str', c: 'x' }] }]] };
  const plain = { t: 'Plain', c: [{ t: 'Str', c: 'p' }] };
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Table',
        c: [
          ['', [], []],
          [null, []],
          [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]],
          [['', [], []], []],
          [
            [['', ['g1'], []], 0, [], [row([list])]],
            [['', [], []], 0, [], [row([plain])]],
          ],
          [['', [], []], []],
        ],
      },
    ],
  };
  const { warnings } = pandocToCarveAst(doc);
  assert.ok(warnings.some((w) => w.includes('2 body groups merge into one')), warnings.join(' | '));
  assert.ok(warnings.some((w) => w.includes("body group's attributes are dropped")), warnings.join(' | '));
});
