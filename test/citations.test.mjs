import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import * as carve from '@markup-carve/carve';
import { carveAstToPandoc, carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { execFileSync } from 'node:child_process';
import { findPandoc, pandocRender } from './helpers.mjs';

/** Read foreign source with pandoc, so the fixture is pandoc's own output. */
const pandocRead = (bin, source, from = 'markdown') =>
  execFileSync(bin, ['-f', from, '-t', 'json'], { input: source, encoding: 'utf8' });

const pandoc = findPandoc();

/*
 * Citations are a Tier-2 extension, so the core parser never produces a
 * `citation_group` and `carveToPandoc` cannot reach one. The production path is
 * the exchange AST - `carve --to-json` from a citations-enabled engine, piped
 * into `carveAstToPandoc` - which is what these tests drive.
 *
 * Before this file existed the forward direction had no switch arm at all: a
 * `citation_group` fell through to `plainText()`, which reads `value` and
 * `children` and finds neither, so the whole citation left the document as an
 * empty string with a generic "unknown node type" warning. Measured on the
 * fixture below: `See  and .`
 */

const cite = (src) => carve.parse(src, { extensions: [carve.citations()] });

/** A real document: integral group, prefix, typed locator, suppressed author. */
const FIXTURE = `# Sources

Newton stood on shoulders [see also @smith2020, p. 33 and following; -@jones1999].

An integral cluster reads [+@doe2021, chap. 4] in the sentence.

A plain parenthetical [@roe1999] closes it.

[@smith2020]: Smith, Jane. 2020.
[@jones1999]: Jones, Ada. 1999.
[@doe2021]: Doe, John. 2021.
[@roe1999]: Roe, Ann. 1999.
`;

const citesOf = (doc) => {
  const found = [];
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (node.t === 'Cite') found.push(node);
    if (node.c !== undefined) walk(node.c);
  };
  walk(doc.blocks);
  return found;
};

const groupsOf = (ast) => {
  const found = [];
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'citation_group') found.push(node);
    if (Array.isArray(node.children)) walk(node.children);
    if (Array.isArray(node.rows)) walk(node.rows);
  };
  walk(ast.children ?? []);
  return found;
};

test('citations: a group reaches pandoc as a native Cite, not an empty string', () => {
  const { doc, warnings } = carveAstToPandoc(cite(FIXTURE));
  const cites = citesOf(doc);
  // Seven, not three: the extension's `afterParse` hook strips `[@key]:`
  // definition lines at RENDER time, so a plain `parse()` still carries all
  // four of them as citation groups of their own. The bridge converts the tree
  // it is handed; that count is the measured one, not a rounded intent.
  assert.equal(cites.length, 7, `three in the body plus four definition lines: ${JSON.stringify(cites.map((x) => x.c[0].map((y) => y.citationId)))}`);
  assert.ok(!warnings.some((w) => w.includes('unknown node type "citation_group"')), warnings.join(' | '));

  const [first] = cites;
  const [records, content] = first.c;
  assert.deepEqual(records.map((r) => r.citationId), ['smith2020', 'jones1999']);
  assert.equal(records[0].citationMode.t, 'NormalCitation');
  assert.equal(records[1].citationMode.t, 'SuppressAuthor', '`-@key` is a suppressed author');
  assert.deepEqual(records[0].citationPrefix, [{ t: 'Str', c: 'see' }, { t: 'Space' }, { t: 'Str', c: 'also' }]);
  // D2(a): the locator goes into the suffix behind citeproc's own `, `.
  assert.equal(records[0].citationSuffix[0].t, 'Str');
  assert.equal(records[0].citationSuffix[0].c, ',');
  assert.ok(
    records[0].citationSuffix.map((x) => (x.t === 'Space' ? ' ' : x.c)).join('').includes('p. 33 and following'),
    JSON.stringify(records[0].citationSuffix),
  );
  // The Cite content is the verbatim source, which is where the text a
  // non-citeproc writer prints comes from.
  assert.equal(
    content.map((x) => (x.t === 'Space' ? ' ' : x.c)).join(''),
    '[see also @smith2020, p. 33 and following; -@jones1999]',
  );
});

test('citations: an integral group marks every item AuthorInText', () => {
  const { doc } = carveAstToPandoc(cite('Read [+@doe2021, chap. 4].\n\n[@doe2021]: Doe.\n'));
  const [records] = citesOf(doc)[0].c;
  assert.equal(records[0].citationMode.t, 'AuthorInText');
});

test('citations: the typed locator flattening into the suffix is reported', () => {
  const { warnings } = carveAstToPandoc(cite(FIXTURE));
  const typed = warnings.filter((w) => w.includes('typed locator'));
  assert.equal(typed.length, 2, `smith2020's page and doe2021's chapter: ${warnings.join(' | ')}`);
  assert.ok(typed.some((w) => w.includes('@smith2020') && w.includes('(page)')), typed.join(' | '));
  assert.ok(typed.some((w) => w.includes('@doe2021') && w.includes('(chapter)')), typed.join(' | '));
  // A group with no locator says nothing.
  const plain = carveAstToPandoc(cite('Text [@roe1999].\n\n[@roe1999]: Roe.\n'));
  assert.deepEqual(plain.warnings, []);
});

test('citations: a suppressed author inside an integral group is reported', () => {
  const { doc, warnings } = carveAstToPandoc(cite('Read [+@doe2021; -@roe1999].\n\n[@doe2021]: D.\n[@roe1999]: R.\n'));
  const [records] = citesOf(doc)[0].c;
  assert.deepEqual(records.map((r) => r.citationMode.t), ['AuthorInText', 'SuppressAuthor']);
  assert.ok(
    warnings.some((w) => w.includes('@roe1999') && w.includes('integral group')),
    warnings.join(' | '),
  );
});

test('citations: a Cite becomes a citation group, not literal citation text', () => {
  const { doc } = carveAstToPandoc(cite(FIXTURE));
  const { ast, warnings } = pandocToCarveAst(doc);
  const groups = groupsOf(ast);
  assert.equal(groups.length, 7, 'three in the body plus the four definition lines');
  assert.deepEqual(groups[0].items.map((i) => i.key), ['smith2020', 'jones1999']);
  assert.equal(groups[0].items[1].suppressAuthor, true);
  assert.deepEqual(groups[0].items[0].prefix, [{ type: 'text', value: 'see also' }]);
  assert.deepEqual(groups[0].items[0].locator, [{ type: 'text', value: 'p. 33 and following' }]);
  assert.equal(groups[1].mode, 'integral', 'the integral marker is recovered from the modes');
  assert.equal(groups[2].mode, undefined, 'a parenthetical group carries no mode');
  assert.ok(!warnings.some((w) => w.includes('degraded to literal citation text')), warnings.join(' | '));
});

test('citations: the bibliography diagnostic fires once per document', () => {
  const { doc } = carveAstToPandoc(cite(FIXTURE));
  const { warnings } = pandocToCarve(doc);
  const bib = warnings.filter((w) => w.includes('bibliography entries live in pandoc metadata'));
  assert.equal(bib.length, 1, `three Cites, one document-level diagnostic: ${warnings.join(' | ')}`);
});

test('citations: round trip preserves ids, modes and locators', () => {
  const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'pos' ? undefined : v)));
  const { doc } = carveAstToPandoc(cite(FIXTURE));
  const { carve: source } = pandocToCarve(doc);

  // The `raw` field is what renderCarve writes, so the source comes back byte
  // for byte and the engine re-derives `locatorLabel`/`locatorValue` from it -
  // which is why this bridge does not carry a second copy of §4.2's table.
  const before = groupsOf(strip(cite(FIXTURE)));
  const after = groupsOf(strip(cite(source)));
  assert.equal(after.length, before.length);
  assert.deepEqual(after, before, `round-tripped source:\n${source}`);
  assert.equal(after[0].items[0].locatorLabel, 'page');
  assert.equal(after[0].items[0].locatorValue, '33');
  assert.equal(after[1].mode, 'integral');
});

test('citations: a foreign Cite whose content is prose gets a rebuilt source', () => {
  // What a docx or a citeproc-processed document hands over: the rendered
  // citation, not Carve's bracket form.
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Para',
        c: [
          {
            t: 'Cite',
            c: [
              [
                {
                  citationId: 'smith2020',
                  citationPrefix: [],
                  citationSuffix: [{ t: 'Str', c: ',' }, { t: 'Space' }, { t: 'Str', c: 'p. 12' }],
                  citationMode: { t: 'AuthorInText' },
                },
              ],
              [{ t: 'Str', c: 'Smith' }, { t: 'Space' }, { t: 'Str', c: '(2020,' }, { t: 'Space' }, { t: 'Str', c: '12)' }],
            ],
          },
        ],
      },
    ],
  };
  const { ast } = pandocToCarveAst(doc);
  const [group] = groupsOf(ast);
  assert.equal(group.raw, '[+@smith2020, p. 12]', 'rebuilt in Carve syntax, not kept as prose');
  assert.equal(group.mode, 'integral');
  assert.deepEqual(group.items[0].locator, [{ type: 'text', value: 'p. 12' }]);
});

test('citations: a foreign Cite mixing AuthorInText with NormalCitation is reported', () => {
  const record = (id, mode) => ({
    citationId: id,
    citationPrefix: [],
    citationSuffix: [],
    citationMode: { t: mode },
  });
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Para',
        c: [{ t: 'Cite', c: [[record('a', 'AuthorInText'), record('b', 'NormalCitation')], []] }],
      },
    ],
  };
  const { ast, warnings } = pandocToCarveAst(doc);
  assert.equal(groupsOf(ast)[0].mode, 'integral');
  assert.ok(
    warnings.some((w) => w.includes('mixes AuthorInText with NormalCitation')),
    warnings.join(' | '),
  );
});

test('citations: citeproc reads the locator back out of the suffix', { skip: !pandoc && 'pandoc not found' }, () => {
  const { doc } = carveAstToPandoc(cite('See [@smith2020, p. 33].\n\n[@smith2020]: S.\n'));
  const dir = mkdtempSync(join(tmpdir(), 'pandoc-carve-cite-'));
  const bib = join(dir, 'bib.json');
  writeFileSync(
    bib,
    JSON.stringify([
      {
        id: 'smith2020',
        type: 'book',
        title: 'A Book',
        author: [{ family: 'Smith', given: 'Jane' }],
        issued: { 'date-parts': [[2020]] },
      },
    ]),
  );
  const plain = pandocRender(pandoc, doc, 'plain', ['--citeproc', `--bibliography=${bib}`]);
  // This is what D2(a) buys: the locator TYPE is lost, but citeproc still
  // parses the locator out of the suffix and prints the page.
  assert.ok(/\(Smith 2020, 33\)/.test(plain), plain);
  assert.ok(plain.includes('A Book'), 'the reference list resolved the key');
});

test('citations: pandoc writers print the verbatim source when citeproc is off', { skip: !pandoc && 'pandoc not found' }, () => {
  const { doc } = carveAstToPandoc(cite('See [@smith2020, p. 33].\n\n[@smith2020]: S.\n'));
  const latex = pandocRender(pandoc, doc, 'latex');
  assert.ok(latex.includes('@smith2020'), latex);
  assert.ok(latex.includes('p. 33'), latex);
});

test('citations: source the rebuilder cannot reproduce is recovered verbatim', () => {
  // `synthesizeRaw` writes a canonical group: one space after `;`, the prefix
  // flattened to plain text. Neither survives a source that spells it another
  // way, which is why the Cite content is preferred whenever it is Carve-shaped.
  const src = 'A [/see/ @smith2020;@jones1999] B.\n\n[@smith2020]: S.\n[@jones1999]: J.\n';
  const { doc } = carveAstToPandoc(cite(src));
  const { ast } = pandocToCarveAst(doc);
  const [group] = groupsOf(ast);
  assert.equal(group.raw, '[/see/ @smith2020;@jones1999]');
  assert.equal(pandocToCarve(doc).carve, src, 'byte for byte, emphasis and tight `;` included');
});

test('citations: pandoc reading Carve\'s integral form keeps the `+` out of the prefix', { skip: !pandoc && 'pandoc not found' }, () => {
  // Pandoc's markdown reader has no integral marker, so it files Carve's `+`
  // as prefix text and reports NormalCitation. The marker is a group property
  // read off the modes, so carrying it into the prefix would print `[+ @key]`.
  const doc = JSON.parse(
    pandocRead(pandoc, '[+@smith2020, p. 12]\n'),
  );
  const [record] = doc.blocks.flatMap((b) => b.c).filter((i) => i.t === 'Cite')[0].c[0];
  assert.deepEqual(record.citationPrefix, [{ t: 'Str', c: '+' }], 'the premise: pandoc puts it in the prefix');

  const { ast } = pandocToCarveAst(doc);
  const [group] = groupsOf(ast);
  assert.equal(group.items[0].prefix, undefined, 'the `+` is not prose');
  assert.equal(group.raw, '[+@smith2020, p. 12]', 'recovered from the Cite content');
  // `mode` must not contradict the `raw` sitting next to it: the recovered
  // source is the only place pandoc's reader left the integral marker, so it is
  // read back from there, and converting the AST again gives AuthorInText.
  assert.equal(group.mode, 'integral');
  const [again] = carveAstToPandoc(ast).doc.blocks.flatMap((b) => b.c).filter((i) => i.t === 'Cite')[0].c[0];
  assert.equal(again.citationMode.t, 'AuthorInText');
});

test('citations: Cite content that no longer describes its records is rebuilt', () => {
  // A pandoc filter that rewrites `citationId` leaves the display text behind.
  // Preferring that text would write the OLD key back as Carve source, and the
  // next parse would silently restore it.
  const doc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [
      {
        t: 'Para',
        c: [
          {
            t: 'Cite',
            c: [
              [
                {
                  citationId: 'renamed',
                  citationPrefix: [],
                  citationSuffix: [],
                  citationMode: { t: 'NormalCitation' },
                },
              ],
              [{ t: 'Str', c: '[@stale]' }],
            ],
          },
        ],
      },
    ],
  };
  const [group] = groupsOf(pandocToCarveAst(doc).ast);
  assert.equal(group.items[0].key, 'renamed');
  assert.equal(group.raw, '[@renamed]', 'the records are authoritative, not the display text');
});

test('citations: an escaped `\\@` in a prefix is not read as a key', () => {
  const src = 'A [see \\@nobody @smith2020] B.\n\n[@smith2020]: S.\n';
  const { doc } = carveAstToPandoc(cite(src));
  const [group] = groupsOf(pandocToCarveAst(doc).ast);
  assert.deepEqual(group.items.map((i) => i.key), ['smith2020']);
  assert.equal(group.raw, '[see \\@nobody @smith2020]', 'the source still round-trips verbatim');
});

/*
 * `citationNoteNum` - PANDOC'S OWN BOOKKEEPING, AND PANDOC IS THE ORACLE FOR IT.
 *
 * The field used to leave the bridge as a hard-coded 0, which was the one thing
 * standing between a citation and an exact `pandoc -> Carve -> pandoc` round
 * trip. A review reading the pandoc-types haddock argued it SHOULD be 0 outside
 * a note, on the reasoning that a positive value names the note the citation
 * sits in. Measured against the reader instead, that is not what pandoc does:
 * it counts the notes CLOSED so far and stamps that plus one, so a citation in
 * running text before any note carries 1, not 0.
 *
 * That is why these cases are asserted against pandoc's own reader rather than
 * against numbers written down here. If pandoc ever changes the convention,
 * this fails and names the new one, instead of pinning a guess about it.
 */

const noteNums = (json) => [...JSON.stringify(json).matchAll(/"citationNoteNum":(\d+)/g)].map((m) => Number(m[1]));

const NOTE_CASES = [
  ['a citation in running text, before any note', 'a [@x]\n'],
  ['a citation after one note', 'n[^1]\n\nb [@x]\n\n[^1]: f\n'],
  ['a citation after two notes', 'n[^1] m[^2]\n\nb [@x]\n\n[^1]: f\n\n[^2]: g\n'],
  ['a citation INSIDE a note', 'p[^1]\n\n[^1]: inside [@x]\n'],
  ['an inline note, then a citation after it', 'p^[inside [@x]] then [@y]\n'],
];

for (const [what, source] of NOTE_CASES) {
  test(`citations: the note number matches pandoc's reader - ${what}`, { skip: !pandoc && 'pandoc not found' }, () => {
    // The SAME source, read by pandoc's markdown reader and by the bridge.
    // Carve and pandoc-markdown spell citations and footnotes identically here,
    // which is what makes the two readings comparable.
    const expected = noteNums(JSON.parse(pandocRead(pandoc, source)));
    const actual = noteNums(carveToPandoc(source).doc);
    assert.ok(expected.length > 0, 'the case has a citation at all');
    assert.deepEqual(actual, expected);
  });
}

test('citations: a citation survives pandoc -> Carve -> pandoc unchanged', { skip: !pandoc && 'pandoc not found' }, () => {
  // The whole point of tracking the field: the round trip is exact, not exact
  // except for one integer.
  const doc = JSON.parse(pandocRead(pandoc, 'Text [@doe1990] here.\n'));
  const { carve } = pandocToCarve(doc);
  const back = carveToPandoc(carve).doc;
  assert.deepEqual(back.blocks, doc.blocks);
});

/*
 * A `[@key]: entry` DEFINITION (PART 12 section 18).
 *
 * The forward direction had no arm for the node, so it fell to the generic
 * "unknown node type" path: the entry left as a paragraph of its text, which
 * PRINTS in the body of the document where Carve renders nothing, and the key
 * binding it to its citations was dropped. The generic path is a fallback for
 * nodes nobody mapped - a node the exchange schema defines is not one of them.
 */

const definition = (key, text, attrs) => ({
  type: 'citation_definition',
  key,
  ...(attrs ? { attrs } : {}),
  children: text ? [{ type: 'text', value: text }] : [],
});

const doc = (...children) => ({ type: 'document', children });

test('citations: a definition becomes citeproc\'s own bibliography entry', () => {
  const { doc: out, warnings } = carveAstToPandoc(doc(definition('doe1990', 'Doe, J. 1990.')));
  assert.deepEqual(warnings, [], 'a node the schema defines is not "unknown"');
  const [div] = out.blocks;
  assert.equal(div.t, 'Div');
  assert.deepEqual(div.c[0], ['ref-doe1990', ['csl-entry'], []]);
  assert.equal(div.c[1][0].t, 'Para');
  assert.equal(div.c[1][0].c[0].c, 'Doe,');
});

test('citations: the definition keeps the key that binds it to its citations', () => {
  // The failure that matters: the id is what a `Cite` for the same key resolves
  // against, and it used to be gone entirely.
  const { doc: out } = carveAstToPandoc(doc(definition('smith2020', 'S.')));
  assert.equal(out.blocks[0].c[0][0], 'ref-smith2020');
});

test('citations: the {author= year=} metadata rides along', () => {
  const attrs = { keyValues: { author: 'Doe', year: '1990' }, order: ['key'] };
  const { doc: out } = carveAstToPandoc(doc(definition('doe1990', 'D.', attrs)));
  assert.deepEqual(out.blocks[0].c[0][2], [['author', 'Doe'], ['year', '1990']]);
});

test('citations: the entry is wrapped once, not twice', () => {
  // `citation_definition` carries its own Attr, so it must be exempt from the
  // generic attr-wrapper Div - which otherwise put a second Div carrying the
  // same key-values around the one that already had them.
  const attrs = { keyValues: { author: 'Doe' }, order: ['key'] };
  const [div] = carveAstToPandoc(doc(definition('doe1990', 'D.', attrs))).doc.blocks;
  assert.equal(div.c[1].length, 1, 'one child block');
  assert.equal(div.c[1][0].t, 'Para', 'and it is the entry, not another Div');
});

test('citations: an empty entry is an empty Div, not an empty Para', () => {
  // Section 18 allows the empty entry, and pandoc's own readers never produce
  // a `Para` with no inlines.
  const [div] = carveAstToPandoc(doc(definition('bare', ''))).doc.blocks;
  assert.deepEqual(div.c[1], []);
});

test('citations: the entry survives pandoc\'s own writer and reader', { skip: !pandoc && 'pandoc not found' }, () => {
  // The claim being checked is that `csl-entry` is pandoc's vocabulary, not a
  // shape invented here - so pandoc has to recognize it coming back.
  const { doc: out } = carveAstToPandoc(doc(definition('doe1990', 'Doe, J. 1990.')));
  const md = execFileSync(pandoc, ['-f', 'json', '-t', 'markdown'], {
    input: JSON.stringify(out), encoding: 'utf8',
  });
  assert.match(md, /^::: \{#ref-doe1990 \.csl-entry\}$/m);
  const back = JSON.parse(pandocRead(pandoc, md));
  assert.deepEqual(back.blocks, out.blocks);
});
