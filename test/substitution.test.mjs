import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert } from '../dist/convert.js';
import { pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const document = (children) => ({ type: 'document', children });
const paragraph = (children) => ({ type: 'paragraph', children });

test('substitution halves retain inline structure in Pandoc', () => {
  const result = convert(document([
    paragraph([{
      type: 'substitution',
      old: [{ type: 'emphasis', children: [{ type: 'text', value: 'old' }] }],
      new: [{ type: 'strong', children: [{ type: 'text', value: 'new' }] }],
    }]),
  ]));

  const substitution = result.doc.blocks[0].c[0];
  assert.deepEqual(substitution, {
    t: 'Span',
    c: [
      ['', ['substitution'], []],
      [
        { t: 'Span', c: [['', ['deletion'], []], [{ t: 'Emph', c: [{ t: 'Str', c: 'old' }] }]] },
        { t: 'Str', c: '→' },
        { t: 'Span', c: [['', ['insertion'], []], [{ t: 'Strong', c: [{ t: 'Str', c: 'new' }] }]] },
      ],
    ],
  });
});

test('Pandoc substitution spans become old and new inline arrays', () => {
  const pandoc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [{
      t: 'Para',
      c: [{
        t: 'Span',
        c: [
          ['', ['substitution'], []],
          [
            { t: 'Span', c: [['', ['deletion'], []], [{ t: 'Emph', c: [{ t: 'Str', c: 'old' }] }]] },
            { t: 'Str', c: '→' },
            { t: 'Span', c: [['', ['insertion'], []], [{ t: 'Strong', c: [{ t: 'Str', c: 'new' }] }]] },
          ],
        ],
      }],
    }],
  };

  const substitution = pandocToCarveAst(pandoc).ast.children[0].children[0];
  assert.deepEqual(substitution, {
    type: 'substitution',
    old: [{ type: 'emphasis', children: [{ type: 'text', value: 'old' }] }],
    new: [{ type: 'strong', children: [{ type: 'text', value: 'new' }] }],
  });
  assert.equal('oldText' in substitution, false);
  assert.equal('newText' in substitution, false);
});

test('an older installed renderer receives its temporary string view', () => {
  const pandoc = {
    'pandoc-api-version': [1, 23, 1],
    meta: {},
    blocks: [{
      t: 'Para',
      c: [{
        t: 'Span',
        c: [
          ['', ['substitution'], []],
          [
            { t: 'Span', c: [['', ['deletion'], []], [{ t: 'Str', c: 'old' }]] },
            { t: 'Str', c: '→' },
            { t: 'Span', c: [['', ['insertion'], []], [{ t: 'Str', c: 'new' }]] },
          ],
        ],
      }],
    }],
  };

  const { carve } = pandocToCarve(pandoc);
  assert.match(carve, /old/);
  assert.match(carve, /new/);
});
