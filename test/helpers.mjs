import { execFileSync, spawnSync } from 'node:child_process';

/*
 * A runner must know how many things it compared, and say so when that number
 * is not what it should be.
 *
 * markup-carve/carve#755 collects the recurring shape: a check that reports
 * success without having verified anything. Two of its variants live in this
 * repository, and both were measured rather than reasoned about:
 *
 *   - test/corpus.test.mjs and test/equivalence.test.mjs generate their cases
 *     from `readdirSync(test/fixtures)`. Emptied, both register zero per-fixture
 *     tests and exit 0.
 *   - test/examples.test.mjs prints `ok examples: export article matches
 *     goldens` on a host with no pandoc, having compared ONE of the seven
 *     committed goldens for that example. That one is worse than a skip,
 *     because a skip is visible in the log and this is not.
 *
 * The wording is carve's, deliberately: this is the same sentence its
 * scripts/spec/participants.mjs writes, and the two repositories should not
 * disagree about what a short run reads like.
 */

/** @returns {string | null} a finding, or null when the count is sufficient */
export function shortfall({ label, actual, atLeast, of, hint }) {
  if (!Number.isInteger(actual) || actual < 0) {
    return `${label}: participant count is ${actual}, which is not a count at all`;
  }
  if (actual >= atLeast) return null;
  const subject = of ? ` ${of}` : '';
  const because = hint ? ` ${hint}` : '';
  return (
    `${label}: compared ${actual}${subject} but expected at least ${atLeast}. ` +
    `A run over fewer than it should have is not a pass - it is a smaller ` +
    `question answered.${because}`
  );
}

/**
 * The environments where a missing pandoc is a broken checkout rather than a
 * developer without it installed.
 *
 * The submodule check in test/spec-corpus.test.mjs already makes this argument
 * for the corpus - "a skipped corpus and a converted one look the same in a CI
 * log" - and pandoc is the same argument with a different subject: without it,
 * 30 of this suite's 186 tests skip and six of every seven export goldens stop
 * being compared, and the run is still green. The install step in ci.yml is the
 * only thing standing between that and a silent 156-test suite.
 */
export function pandocIsRequired() {
  if (process.env.REQUIRE_PANDOC === '0') return false;
  return Boolean(process.env.CI || process.env.REQUIRE_PANDOC);
}

/** Locate a pandoc executable: $PANDOC, PATH, or the local test fallback. */
export function findPandoc() {
  const candidates = [process.env.PANDOC, 'pandoc', '/tmp/pandoc-3.10.2/bin/pandoc'].filter(Boolean);
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'pipe' });
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

/** Run pandoc -f json -t <target> over a Pandoc doc object; returns stdout. */
export function pandocRender(pandoc, doc, target, extraArgs = []) {
  const result = spawnSync(pandoc, ['-f', 'json', '-t', target, ...extraArgs], {
    input: JSON.stringify(doc),
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`pandoc -t ${target} failed: ${result.stderr}`);
  }
  return result.stdout;
}
