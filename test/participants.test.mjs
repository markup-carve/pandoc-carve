/*
 * What this suite compared, and whether that is what it should have compared.
 *
 * markup-carve/carve#755 collects checks that report success without having
 * verified anything. Three were measured here, each by construction rather than
 * by reading the code:
 *
 *   $ rm -f test/fixtures/*; node --test test/corpus.test.mjs
 *   # pass 1 / # fail 0                 EXIT=0    (four fixtures, zero compared)
 *
 *   $ rm -f test/fixtures/*; node --test test/equivalence.test.mjs
 *   # pass 36 / # fail 0                EXIT=0    (the inline snippets only)
 *
 *   $ node --test test/examples.test.mjs      # on a host with no pandoc
 *   ok - examples: export article matches goldens        (1 of 7 compared)
 *
 * The third is the one worth stating twice. It does not skip. It prints a full
 * pass over a seventh of the population, and the test's own name is plural.
 *
 * The floors live beside each population, because only the runner knows what it
 * should have seen. What lives here is the one fact none of them can state
 * alone: whether the environment is one where a missing pandoc is a broken
 * checkout rather than a developer without it installed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPandoc, pandocIsRequired, shortfall } from './helpers.mjs';

test('pandoc is present wherever it is required to be', () => {
  if (!pandocIsRequired()) {
    // Not a skip. Stating the reduced coverage is the point - a developer
    // running this locally should see which half of the suite did not run.
    console.log(
      '# pandoc not required here (neither CI nor REQUIRE_PANDOC is set). ' +
        (findPandoc()
          ? 'It was found anyway, so the full suite ran.'
          : 'It was NOT found: ~30 tests skip and six of every seven export ' +
            'goldens go uncompared. Set REQUIRE_PANDOC=1 to make that a failure.'),
    );
    return;
  }
  assert.ok(
    findPandoc(),
    'pandoc is required in this environment and was not found. This is a failure ' +
      'rather than a skip on purpose: without it roughly 30 of this suite\'s tests ' +
      'skip and the export goldens compare one file of seven, and the run is still ' +
      'green. .github/workflows/ci.yml installs it; if that step changed, this is ' +
      'what says so.',
  );
});

test('a short count is a finding, and a sufficient one is not', () => {
  assert.equal(shortfall({ label: 'X', actual: 4, atLeast: 4 }), null);
  assert.match(
    shortfall({ label: 'FIXTURES', actual: 0, atLeast: 4, of: 'fixture(s)' }),
    /^FIXTURES: compared 0 fixture\(s\) but expected at least 4\./,
  );
  // A count that is not a count at all must not read as sufficient, which is
  // how an undefined population length passes a `>=` comparison by accident.
  assert.match(shortfall({ label: 'X', actual: undefined, atLeast: 1 }), /not a count at all/);
  assert.match(shortfall({ label: 'X', actual: -1, atLeast: 1 }), /not a count at all/);
});
