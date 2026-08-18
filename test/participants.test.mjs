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
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

test('no test source carries a literal control byte where an escape belongs', () => {
  // markup-carve/carve#755 records this from the carve-php sweep: a control
  // character written as a literal byte in a fixture stops discriminating the
  // moment anything reformats the file, and the test goes on passing over the
  // wrong input. It had already half-happened here - test/corpus.test.mjs
  // carried a literal NUL and a literal BOM inside its adversarial snippets,
  // which made git classify the whole file as binary, so every diff on it was
  // unreviewable. Both are written as escapes now - byte-identical
  // once evaluated and visible in a diff.
  const dir = dirname(fileURLToPath(import.meta.url));
  const offenders = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs'))) {
    const bytes = readFileSync(join(dir, file));
    for (const [index, byte] of bytes.entries()) {
      // Tab, LF and CR are how a source file is laid out. Everything else below
      // 0x20, plus a BOM anywhere, is data that should be spelled as an escape.
      if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) {
        offenders.push(`${file}: byte 0x${byte.toString(16).padStart(2, '0')} at offset ${index}`);
        break;
      }
    }
    // Spelled by code point rather than written out, or this line would be an
    // offender itself - which is how it first failed.
    const bom = Buffer.from(String.fromCharCode(0xfeff), 'utf8')
    if (bytes.includes(bom)) offenders.push(`${file}: a literal BOM`);
  }
  assert.deepEqual(
    offenders,
    [],
    'write these as \\uXXXX escapes: a literal byte survives no reformat, and the ' +
      'test keeps passing over whatever is left',
  );
});

test('the engine under test is the engine the manifest pins', () => {
  // A THIRD POPULATION THAT CAN GO UNCOMPARED: the dependency itself.
  //
  // `package.json` names exact carve-js code, `package-lock.json` resolves it,
  // and `node_modules/.package-lock.json` records what npm actually wrote to
  // disk. Nothing in this suite reads the last one, so a checkout whose
  // `node_modules` predates a pin bump runs every engine-facing test against a
  // DIFFERENT engine and reports the same green.
  //
  // Measured, not hypothesized. A long-lived checkout of this repo held:
  //
  //   package-lock.json                git+...carve-js.git#3f5dd8cb
  //   node_modules/.package-lock.json  registry.npmjs.org/...carve-0.1.3.tgz
  //
  // 0.1.3 is the last released tag and predates the PART 9 section 4b
  // withdrawal (carve#1213), so that tree still carried `block_quote`'s
  // `attribution` field. `npm test` there would have run the quote-figure
  // assertions against an engine that cannot satisfy them - or, worse, passed
  // them one day and not the next with no file in the diff to explain it.
  //
  // The fix is `npm ci`, and this is the line that says so. Development pins
  // use commits before a release; released versions are accepted once they
  // contain the required engine work.
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const dep = '@markup-carve/carve';

  const manifest = read('package.json').dependencies[dep];
  const locked = read('package-lock.json').packages[`node_modules/${dep}`];
  const installed = read('node_modules/.package-lock.json').packages[`node_modules/${dep}`];

  const manifestSha = manifest.split('#')[1];
  if (manifestSha) {
    assert.equal(locked.resolved.split('#')[1], manifestSha, 'package-lock.json did not follow the manifest bump');
    assert.equal(installed.resolved.split('#')[1], manifestSha, `node_modules does not hold ${manifestSha}. Run \`npm ci\``);
  } else {
    assert.match(manifest, /^\d+\.\d+\.\d+$/, `${dep} is not pinned exactly: ${manifest}`);
    assert.equal(locked.version, manifest, 'package-lock.json did not follow the manifest bump');
    assert.equal(installed.version, manifest, `node_modules does not hold release ${manifest}. Run \`npm ci\``);
  }
  assert.ok(
    installed.resolved,
    `node_modules has no resolved engine identity. Run \`npm ci\`: every ` +
      'engine-facing test in this suite is currently measuring a different engine.',
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
