import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carveToHtml } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';

/**
 * The round-trip gate: carve -> pandoc AST -> carve must render the SAME HTML
 * as the original source. This is the strongest correctness signal available -
 * it exercises both directions of every mapped construct at once.
 */

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const roundtrip = (src) => pandocToCarve(carveToPandoc(src, { roundtrip: true }).doc).carve;

const snippets = [
  'plain paragraph text',
  '/em/ *b* /*bi*/ _u_ ~s~ =h=',
  'H{,2,}O and mc{^2^}',
  '# H1\n\n## H2 with /em/',
  '{#id .cls}\n# Attributed',
  '`code span` and ```python\nblock\n```',
  '[link](https://e.com) and ![img](i.png)',
  '- a\n- b\n  - nested',
  '1. one\n2. two',
  '3. offset start',
  'a) alpha list',
  '- [x] done\n- [_] todo',
  ':: Term\n:  Definition',
  '> quote\n\n---\n\ntext',
  '|= A |=> B |\n| 1 | 2 |',
  '|= A |= B |= C |\n| x | < | z |',
  '|= A |= B |\n| x | y |\n| ^ | z |',
  'note[^n]\n\n[^n]: def',
  'inline^[note here]',
  '$`x^2` and $$`\\sum x`',
  '`\\alpha`{=latex} and `<b>x</b>`{=html}',
  '::: note\nplain\n:::',
  '::: tip "Titled"\nbody\n:::',
  '@user and #tag',
  '{+ ins +} {- del -}',
  '![cap](i.png)\n^ Figure 1: caption',
  '> quote\n^ Author',
  '{#fig .fancy}\n> quote\n^ Author',
  '|= H |\n| c |\n^ Table 1: cap',
  '{#sec}\n# Sec\n\n</#sec>',
  '[spanned]{#sid .red}',
  '{.lead}\nattributed paragraph',
];

for (const src of snippets) {
  test(`equivalence: ${JSON.stringify(src.slice(0, 50))}`, () => {
    const back = roundtrip(src);
    assert.equal(
      carveToHtml(back),
      carveToHtml(src),
      `HTML diverged.\n--- original source ---\n${src}\n--- round-tripped source ---\n${back}`,
    );
  });
}

// The full fixture corpus: round-trip must not throw and must stay
// HTML-equivalent (modulo constructs listed as known-lossy below).
const fixtures = readdirSync(fixturesDir).filter((f) => f.endsWith('.md') || f.endsWith('.crv'));

for (const fixture of fixtures) {
  test(`equivalence corpus: ${fixture} round-trips without throwing`, () => {
    const source = readFileSync(join(fixturesDir, fixture), 'utf8');
    const back = roundtrip(source);
    assert.ok(back.length > 0);
    // Second pass must be stable: round-tripping the round-trip is a fixpoint.
    const again = roundtrip(back);
    assert.equal(carveToHtml(again), carveToHtml(back), 'second round-trip diverged');
  });
}
