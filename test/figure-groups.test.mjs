import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToCarveAst, carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();
const GROUP = ['{#fig-x .columns-2}', '::: figure', '{#fig-x-a}', '![one](a.png)', '^ (a) One', '', '{#fig-x-b}', '![two](b.png)', '^ (b) Two', ':::', '^ Figure #: Group caption', ''].join('\n');
const blocks = (source) => carveToPandoc(source).doc.blocks;
const words = (node) => {
  if (Array.isArray(node)) return node.map(words).join('');
  if (!node || typeof node !== 'object') return '';
  if (node.t === 'Str') return node.c;
  if (node.t === 'Space') return ' ';
  return words(node.c);
};
const captionText = (node) => words(node.c[1][1]);
const image = (src, alt) => ({ t: 'Image', c: [['', [], []], [{ t: 'Str', c: alt }], [src, '']] });
const nested = (id, alt, src, caption) => ({ t: 'Figure', c: [[id, [], []], [null, [{ t: 'Plain', c: [{ t: 'Str', c: caption }] }]], [{ t: 'Plain', c: [image(src, alt)] }]] });
const foreign = (children, short = null) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Figure', c: [['fig-x', [], []], [short, [{ t: 'Plain', c: [{ t: 'Str', c: 'Group' }] }]], children] }] });

test('a bare figure fence becomes a Pandoc Figure of nested Figures', () => {
  const [figure] = blocks(GROUP);
  assert.equal(figure.t, 'Figure');
  assert.equal(figure.c[0][0], 'fig-x');
  assert.deepEqual(figure.c[0][1], ['carve-figure-group', 'columns-2']);
  assert.ok(figure.c[0][2].some(([key]) => key === 'carve-caption'));
  assert.equal(captionText(figure), 'Figure 1: Group caption');
  assert.deepEqual(figure.c[2].map((child) => child.t), ['Figure', 'Figure']);
  assert.deepEqual(figure.c[2].map((child) => child.c[0][0]), ['fig-x-a', 'fig-x-b']);
});

test('control: titled and labelled figure divs are not groups', () => {
  const titled = carveToCarveAst('::: figure "Title"\nText.\n:::\n^ Figure #: Caption\n');
  assert.equal(titled.children[0].type, 'div');
  assert.equal(titled.children[0].title[0].value, 'Title');
  assert.equal(titled.children[1].type, 'paragraph');
  const labelled = carveToCarveAst('::: figure [g]\nBody.\n:::\n');
  assert.equal(labelled.children[0].type, 'div');
  assert.equal(labelled.children[0].groupLabel, 'g');
});

test('the group is one numbering unit at its opening fence', () => {
  const source = ':::: figure\n::: note\n![x](x.png)\n^ Figure #: inner\n:::\n::::\n^ Figure #: group\n';
  const [figure] = blocks(source);
  assert.equal(captionText(figure), 'Figure 1: group');
  const inner = figure.c[2][0].c[1][0];
  assert.equal(inner.t, 'Figure');
  assert.equal(captionText(inner), 'Figure 2: inner');
});

test("a panel's number placeholder stays literal and consumes no number", () => {
  const [figure, after] = blocks('::: figure\n![one](a.png)\n^ Figure #: A panel\n:::\n^ Figure #: Group\n\n![z](z.png)\n^ Figure #: After\n');
  assert.equal(captionText(figure.c[2][0]), 'Figure #: A panel');
  assert.equal(captionText(figure), 'Figure 1: Group');
  assert.equal(captionText(after), 'Figure 2: After');
});

test('panel IDs cross-reference as the group number and a letter', () => {
  const source = '{#fig-first}\n![lead](lead.png)\n^ Figure #: First\n\n{#fig-x}\n::: figure\n{#fig-a}\n![one](a.png)\n^ (a) One\n\n{#fig-b}\n![two](b.png)\n^ (b) Two\n:::\n^ Figure #: Second\n\nSee </#fig-x>, </#fig-a> and </#fig-b>.\n';
  const links = blocks(source).at(-1).c.filter((node) => node.t === 'Link');
  assert.deepEqual(links.map((link) => [link.c[2][0], words(link.c[1])]), [['#fig-x', 'Figure 2'], ['#fig-a', 'Figure 2a'], ['#fig-b', 'Figure 2b']]);
});

test('a captioned quote is a panel and the same figure wrapper outside the group', () => {
  const [figure] = blocks('::: figure\n> Brevity.\n^ A quoted panel\n:::\n^ Figure #: G\n');
  assert.equal(figure.c[2][0].t, 'Figure');
  assert.equal(figure.c[2][0].c[2][0].t, 'BlockQuote');
  assert.equal(blocks('> Brevity.\n^ An attribution\n')[0].t, 'Figure');
  assert.equal(blocks('> Brevity.\n')[0].t, 'BlockQuote');
});

test('stray content remains in place between panels', () => {
  const [figure] = blocks('::: figure\nBoth were shot the same day.\n\n![one](a.png)\n^ (a) One\n:::\n^ Figure #: G\n');
  assert.deepEqual(figure.c[2].map((block) => block.t), ['Para', 'Figure']);
});

test('a table panel keeps its caption without a Figure wrapper', () => {
  const [figure] = blocks('::: figure\n|= a |= b |\n| 1 | 2 |\n^ Table #: A table panel\n:::\n^ Figure #: G\n');
  assert.equal(figure.c[2][0].t, 'Table');
  assert.equal(captionText(figure.c[2][0]), 'Table #: A table panel');
});

test('a subfigure-shaped Pandoc Figure imports as figure_group', () => {
  const { ast, warnings } = pandocToCarveAst(foreign([nested('fig-a', 'one', 'a.png', 'A'), nested('fig-b', 'two', 'b.png', 'B')]));
  const [figure] = ast.children;
  assert.equal(figure.type, 'figure_group');
  assert.equal(figure.attrs.id, 'fig-x');
  assert.deepEqual(figure.children.map((child) => child.type), ['figure', 'figure']);
  assert.deepEqual(figure.children.map((child) => child.attrs.id), ['fig-a', 'fig-b']);
  assert.equal(figure.caption.children[0].children[0].value, 'Group');
  assert.deepEqual(warnings, []);
});

test('control: a single-target Pandoc Figure stays a figure', () => {
  const { ast } = pandocToCarveAst(foreign([{ t: 'Plain', c: [image('x.png', 'x')] }]));
  assert.equal(ast.children[0].type, 'figure');
});

test('a Figure-wrapped table panel keeps its wrapper ID', () => {
  const table = { t: 'Table', c: [['', ['inner'], []], [null, []], [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]], [['', [], []], []], [[['', [], []], 0, [], []]], [['', [], []], []]] };
  const wrapper = { t: 'Figure', c: [['panel-t', ['wide'], []], [null, [{ t: 'Plain', c: [{ t: 'Str', c: 'A table panel' }] }]], [table]] };
  const [group] = pandocToCarveAst(foreign([wrapper])).ast.children;
  assert.equal(group.type, 'figure_group');
  assert.equal(group.children[0].type, 'figure_group');
  assert.equal(group.children[0].attrs.id, 'panel-t');
  assert.equal(group.children[0].children[0].type, 'table');
});

test('a Pandoc group short caption survives in the 0.2 caption node', () => {
  const [group] = pandocToCarveAst(foreign([nested('fig-a', 'one', 'a.png', 'A')], [{ t: 'Str', c: 'nav' }])).ast.children;
  assert.equal(group.type, 'figure_group');
  assert.deepEqual(group.caption.short, [{ type: 'text', value: 'nav' }]);
});

test('the group survives Carve to Pandoc to Carve as a group', () => {
  const { doc, warnings } = carveToPandoc(GROUP);
  assert.deepEqual(warnings, []);
  const back = pandocToCarve(doc);
  assert.deepEqual(back.warnings, []);
  assert.equal(back.carve, GROUP);
  assert.equal(pandocToCarve(carveToPandoc(back.carve).doc).carve, back.carve);
});

test("a panel's literal number placeholder comes back as literal text", () => {
  const source = '::: figure\n![one](a.png)\n^ Figure #: A panel\n:::\n^ Figure #: Group\n';
  const { carve } = pandocToCarve(carveToPandoc(source).doc);
  const [group] = carveToCarveAst(carve).children;
  assert.equal(group.type, 'figure_group');
  assert.equal(group.children[0].caption.children[0].children.map((child) => child.value ?? '#').join(''), 'Figure #: A panel');
});

test('the nesting reaches Pandoc writers', { skip: !pandoc && 'pandoc not found' }, () => {
  const { doc } = carveToPandoc(GROUP);
  const latex = pandocRender(pandoc, doc, 'latex');
  assert.ok(latex.includes('subfigure'), latex);
  const html = pandocRender(pandoc, doc, 'html');
  assert.match(html, /<figure[^>]*>[\s\S]*<figure/u);
});
