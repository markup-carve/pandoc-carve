/*
 * A DANGEROUS URL SCHEME DOES NOT REACH PANDOC (#157).
 *
 * Carve's writers blank a destination whose scheme PART 9 §25 denies, and the
 * clause binds every target that emits a resolvable URL. The AST keeps what the
 * author wrote, this bridge reads the AST, and `pandoc -f json -t html` is one
 * command away - so a scheme passed through here is the same sink one step
 * removed, not a narrower policy.
 *
 * THREE ARMS, AND EACH ANSWERS A DIFFERENT QUESTION.
 *
 * 1. THE MIRROR IS PINNED TO THE ENGINE, AND THE PIN IS AUTHORITATIVE.
 *    src/url-scheme.ts restates the scheme list and the probe class, because
 *    the engine's package export map reaches neither `render-html.ts` nor
 *    `deny-listed-destination.ts`. A restatement that nothing checks is a
 *    second policy waiting to drift.
 *
 *    The first arm therefore reads the engine's ACTUAL list and probe out of
 *    its installed files - by `file:` URL, which the export map does not gate -
 *    and compares them as sets. Iterating only the mirror's own names would be
 *    a check that cannot see the failure it exists for: a scheme the engine
 *    ADDS is absent from the mirror, so it would never be asked about, and
 *    `@markup-carve/carve` is depended on as `^0.1.5`. The behavioral arms
 *    below then drive the engine's own `renderHtml` over a battery of
 *    obfuscations and legitimate destinations, which is what catches a change
 *    the two constants do not spell.
 *
 * 2. THE SEVEN CORPUS DOCUMENTS. `108-security-hardening` and its siblings plus
 *    `121-scheme-probe-strips-unicode-whitespace` were ledgered in
 *    test/corpus-link-targets.test.mjs as model differences pointing at #157.
 *    They come off that ledger with this change, and are asserted here directly
 *    - blanked target AND a diagnostic - because the ledger arm compares
 *    targets and would not notice a silent blanking.
 *
 * 3. THE NEGATIVE CONTROLS. A sanitizer that blanks too much is the worse bug,
 *    and nothing in the seven documents would catch it: they contain no link
 *    that must survive. So an ordinary `https:`, a relative destination, a
 *    fragment and a `mailto:` are asserted untouched and silent.
 *
 * WHY THE PROBE IS NOT A `startsWith`, AND WHICH ARM PROVES IT. Corpus 121
 * looks like the answer - its definition line is `[a]: <U+202F>javascript:...`
 * - but it is not: measured on the pinned engine, the PARSER strips the leading
 * NARROW NO-BREAK SPACE, so the bridge is handed a plain `javascript:` and a
 * naive prefix check passes that document. A control character INSIDE the
 * scheme is a different matter and survives the parse intact:
 * `[a](java<DEL>script:x)` reaches the AST with the DEL still in it, and the
 * engine's writer blanks it. The last arm below authors exactly those forms as
 * Carve SOURCE, which is what makes the strip class load-bearing here rather
 * than decorative.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carveToPandoc } from '../dist/index.js';
import {
  DANGEROUS_URL_SCHEMES,
  SCHEME_PROBE_STRIP_RE,
  blankDeniedDestination,
  probeScheme,
} from '../dist/url-scheme.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = join(repo, 'spec', 'tests', 'corpus');

/** Every Link and Image target in a Pandoc document, in document order. */
function targets(node, found = []) {
  if (Array.isArray(node)) {
    for (const child of node) targets(child, found);
    return found;
  }
  if (node && typeof node === 'object') {
    if ((node.t === 'Link' || node.t === 'Image') && Array.isArray(node.c)) {
      found.push(node.c[2]?.[0]);
    }
    for (const value of Object.values(node)) targets(value, found);
  }
  return found;
}

const unsafe = (result) => result.diagnostics.filter((d) => d.code === 'unsafe-url-scheme');

// ---------------------------------------------------------------- arm 1

/**
 * Whether the ENGINE keeps this destination, asked of the engine itself.
 *
 * A hand-built AST rather than Carve source: a source spelling would have to
 * survive the parser's own escaping rules, and several probe strings here are
 * unspellable. Emptiness is compared rather than the URL, because the writer
 * escapes an attribute and the AST does not - and emptiness is the whole
 * question.
 */
function engineKeeps(renderHtml, url, kind = 'link') {
  const node = kind === 'link'
    ? { type: 'link', href: url, children: [{ type: 'text', value: 'x' }] }
    : { type: 'image', src: url, alt: 'x' };
  const html = renderHtml({
    type: 'document',
    children: [{ type: 'paragraph', children: [node] }],
  });
  const attr = kind === 'link' ? /<a\b[^>]*\bhref="([^"]*)"/ : /<img\b[^>]*\bsrc="([^"]*)"/;
  const found = attr.exec(html);
  assert.ok(found, `the engine rendered no ${kind} destination for ${JSON.stringify(url)}`);
  return found[1] !== '';
}

const OBFUSCATIONS = [
  '\u202Fjavascript:alert(1)',            // NARROW NO-BREAK SPACE - corpus 121
  '\u00A0javascript:alert(1)',            // NBSP
  '\uFEFFjavascript:alert(1)',            // BOM / zero-width no-break space
  '\u3000javascript:alert(1)',            // IDEOGRAPHIC SPACE
  '\u2028javascript:alert(1)',            // LINE SEPARATOR
  ' \tjavascript:alert(1)',               // ASCII whitespace
  'java\u007Fscript:alert(1)',            // DEL inside the scheme
  'java\u0001script:alert(1)',            // C0 control inside the scheme
  'java\u0085script:alert(1)',            // C1 control inside the scheme
  'JaVaScRiPt:alert(1)',                    // case
  '\u00A0JAVASCRIPT:alert(1)',            // case and obfuscation at once
  'ms-msdt:/id',
  'SHELL:Startup',
  'ms\u00A0-msdt:/id',                    // stripped inside a hyphenated scheme
];

const LEGITIMATE = [
  'https://example.com/a?b=1&c=2',
  'http://example.com',
  'mailto:someone@example.com',
  'tel:+15551234',
  'ftp://example.com/x',
  'sms:+15551234',
  '/relative/path',
  'relative/path',
  '?query=1',
  '#fragment',
  '//protocol-relative.example.com/x',
  'not-a-scheme-just-text',
  'javascriptish://example.com',        // the denied name as a PREFIX only
  'x-javascript://example.com',         // the denied name as a SUFFIX only
];

/**
 * The engine's own §25 constants, read out of the installed package.
 *
 * `render-html.js` is not in the export map, so this goes through a `file:`
 * URL, which the map does not gate. That is a private path on purpose and the
 * failure mode is deliberate: if a future engine renames or moves the module
 * this THROWS, and a loud failure asking someone to re-derive the mirror is the
 * correct outcome for a security policy that has stopped being verifiable.
 */
/**
 * The engine's `dist/` this run measures against.
 *
 * `CARVE_ENGINE_DIR` points at an UNPACKED engine package - the engine-drift
 * workflow sets it to whatever `@markup-carve/carve@<the range in
 * package.json>` resolves to on the registry, which is the engine a CONSUMER
 * installs and not the one this repo's lockfile pins. Unset, it is the
 * installed engine, which is what an ordinary `npm test` should measure.
 */
function engineDist() {
  const override = process.env.CARVE_ENGINE_DIR;
  if (override) {
    assert.ok(
      existsSync(join(override, 'package.json')),
      `CARVE_ENGINE_DIR=${override} holds no package.json - it must point at an ` +
        'unpacked engine package, not at its tarball or its dist/',
    );
    return join(override, 'dist');
  }
  const require = createRequire(import.meta.url);
  return join(dirname(require.resolve('@markup-carve/carve/package.json')), 'dist');
}

/**
 * One of the engine's §25 modules, read out of that dist by `file:` URL.
 *
 * Neither is in the engine's export map, so this is a private path on purpose,
 * and the failure mode is deliberate: if a future engine renames or moves the
 * module this THROWS. A loud failure asking someone to re-derive the mirror is
 * the correct outcome for a security policy that has stopped being verifiable.
 */
async function engineModule(file) {
  const path = join(engineDist(), file);
  try {
    return await import(pathToFileURL(path).href);
  } catch (cause) {
    throw new Error(
      `the engine's ${file} could not be read at ${path}, so src/url-scheme.ts ` +
        'is a mirror of nothing. Re-derive DANGEROUS_URL_SCHEMES and ' +
        'SCHEME_PROBE_STRIP_RE from the engine and repoint this test.',
      { cause },
    );
  }
}

const enginePolicy = () => engineModule('render-html.js');


test('the mirror holds exactly the schemes the engine denies, no more and no fewer', async () => {
  const engine = await enginePolicy();
  const theirs = engine.DANGEROUS_URL_SCHEMES;
  assert.ok(Array.isArray(theirs) && theirs.length > 0, 'the engine published no denylist');
  const added = theirs.filter((scheme) => !DANGEROUS_URL_SCHEMES.includes(scheme));
  const removed = DANGEROUS_URL_SCHEMES.filter((scheme) => !theirs.includes(scheme));
  assert.deepEqual(
    added,
    [],
    'the engine denies scheme(s) this bridge passes through - add them to ' +
      `src/url-scheme.ts: ${added.join(', ')}`,
  );
  assert.deepEqual(
    removed,
    [],
    'this bridge denies scheme(s) the engine does not, so it blanks a ' +
      `destination Carve itself keeps: ${removed.join(', ')}`,
  );
});

test("the mirror probes with the engine's own strip class", async () => {
  const engine = await enginePolicy();
  assert.equal(
    String(engine.SCHEME_PROBE_STRIP_RE),
    String(SCHEME_PROBE_STRIP_RE),
    'the engine changed which characters it strips before reading a scheme',
  );
});

test("the mirror answers as the engine's shared helper does", async () => {
  // The helper the engine's own non-HTML writers use, which is the closest
  // analogue to what this bridge is: a target that emits a resolvable URL.
  const shared = await engineModule('deny-listed-destination.js');
  for (const url of [...OBFUSCATIONS, ...LEGITIMATE, ...DANGEROUS_URL_SCHEMES.map((s) => `${s}:x`)]) {
    assert.equal(
      blankDeniedDestination(url),
      shared.blankDeniedDestination(url),
      `mirror and the engine's shared helper disagree on ${JSON.stringify(url)}`,
    );
  }
});

test('the mirrored denylist agrees with the engine, scheme for scheme', async () => {
  const { renderHtml } = await enginePolicy();
  assert.ok(DANGEROUS_URL_SCHEMES.length >= 20, 'the mirrored denylist is suspiciously short');
  for (const scheme of DANGEROUS_URL_SCHEMES) {
    const url = `${scheme}:payload`;
    assert.equal(
      blankDeniedDestination(url),
      '',
      `the mirror keeps ${url}, which it names as denied`,
    );
    assert.equal(
      engineKeeps(renderHtml, url),
      false,
      `the mirror denies ${scheme}: and the engine does not - the mirror has drifted ` +
        'ahead of the engine, or the engine dropped the scheme',
    );
  }
});

test('the mirror and the engine agree on obfuscated and legitimate destinations', async () => {
  const { renderHtml } = await enginePolicy();
  for (const url of [...OBFUSCATIONS, ...LEGITIMATE]) {
    for (const kind of ['link', 'image']) {
      assert.equal(
        blankDeniedDestination(url) !== '',
        engineKeeps(renderHtml, url, kind),
        `mirror and engine disagree on ${JSON.stringify(url)} as a ${kind} destination`,
      );
    }
  }
});

test('every obfuscation in the battery is actually denied, and every control kept', () => {
  // Guards the arm above from passing on two sides that agree about nothing:
  // if the battery held only harmless strings, "they agree" would be vacuous.
  for (const url of OBFUSCATIONS) {
    assert.equal(blankDeniedDestination(url), '', `${JSON.stringify(url)} slipped through`);
  }
  for (const url of LEGITIMATE) {
    assert.equal(blankDeniedDestination(url), url, `${JSON.stringify(url)} was blanked`);
  }
});

// ---------------------------------------------------------------- arm 2

/**
 * The seven documents #157 named, with what each one exercises.
 *
 * The count is asserted below: a corpus checkout that lost one of these would
 * otherwise shrink the question silently.
 */
const CORPUS_CASES = [
  ['108-security-hardening.crv', ['javascript']],
  ['108-security-hardening-2.crv', ['vbscript']],
  ['108-security-hardening-3.crv', ['ms-office']],
  ['108-security-hardening-4.crv', ['ms-msdt']],
  ['108-security-hardening-5.crv', ['shell', 'ms-msdt']],
  ['108-security-hardening-7.crv', ['javascript']],
  ['121-scheme-probe-strips-unicode-whitespace.crv', ['javascript']],
];

test('the spec corpus submodule is checked out', () => {
  assert.ok(
    existsSync(corpusDir),
    `${corpusDir} is missing. Run "git submodule update --init". A failure ` +
      'rather than a skip: a skipped corpus and a clean one read the same.',
  );
});

if (existsSync(corpusDir)) {
  test('the seven #157 documents reach pandoc with the destination blanked', () => {
    let checked = 0;
    for (const [file, schemes] of CORPUS_CASES) {
      const path = join(corpusDir, file);
      assert.ok(existsSync(path), `${file} is gone from the corpus`);
      const result = carveToPandoc(readFileSync(path, 'utf8'));

      const found = targets(result.doc);
      assert.equal(found.length, schemes.length, `${file}: expected ${schemes.length} destination(s)`);
      for (const target of found) {
        assert.equal(target, '', `${file}: a destination reached pandoc as ${JSON.stringify(target)}`);
      }

      const diagnostics = unsafe(result);
      assert.deepEqual(
        diagnostics.map((d) => d.details.scheme),
        schemes,
        `${file}: the diagnostics do not name the schemes the document carries`,
      );
      for (const diagnostic of diagnostics) {
        assert.equal(diagnostic.severity, 'lossy', `${file}: the diagnostic must reach --fail-on-loss`);
        assert.equal(diagnostic.direction, 'carve-to-pandoc');
        assert.match(diagnostic.message, /^url: a denied scheme on a (link|image) destination is blanked/);
      }
      checked += 1;
    }
    assert.equal(checked, 7, 'all seven #157 documents must be checked');
  });

  test('the sidecar agrees: each of the seven states an empty destination', () => {
    // The spec's own words, not the engine's - the sidecar is the one artifact
    // in the checkout the engine did not produce.
    for (const [file] of CORPUS_CASES) {
      const html = readFileSync(join(corpusDir, file.replace(/\.crv$/, '.html')), 'utf8');
      const stated = [
        ...[...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]),
        ...[...html.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)].map((m) => m[1]),
      ];
      assert.ok(stated.length > 0, `${file}: the sidecar states no destination at all`);
      for (const target of stated) assert.equal(target, '', `${file}: sidecar keeps ${target}`);
    }
  });
}

test('a link, an autolink and an image are each covered', () => {
  const cases = [
    ['[a](javascript:x)', 'link'],
    ['<vbscript:msgbox>', 'link'],
    ['![a](shell:Startup)', 'image'],
  ];
  for (const [source, construct] of cases) {
    const result = carveToPandoc(source);
    assert.deepEqual(targets(result.doc), [''], `${source}: destination survived`);
    const [diagnostic, ...rest] = unsafe(result);
    assert.ok(diagnostic, `${source}: no diagnostic`);
    assert.equal(rest.length, 0, `${source}: more diagnostics than destinations`);
    assert.equal(diagnostic.details.construct, construct);
  }
});

test('the diagnostic carries the destination it refused', () => {
  const result = carveToPandoc('[click here](javascript:stealCookies)');
  const [diagnostic] = unsafe(result);
  assert.equal(diagnostic.details.destination, 'javascript:stealCookies');
  assert.equal(diagnostic.details.scheme, 'javascript');
  // The link TEXT is untouched: only the destination goes, as in the HTML writer.
  assert.match(JSON.stringify(result.doc), /"click"/);
});

// ---------------------------------------------------------------- arm 3

test('an ordinary destination is untouched and silent', () => {
  const cases = [
    ['[a](https://example.com/x?y=1&z=2)', 'https://example.com/x?y=1&z=2'],
    ['[a](/relative/path)', '/relative/path'],
    ['[a](relative/path)', 'relative/path'],
    ['[a](mailto:someone@example.com)', 'mailto:someone@example.com'],
    ['[a](tel:+15551234)', 'tel:+15551234'],
    ['[a](ftp://example.com/x)', 'ftp://example.com/x'],
    ['<https://example.com>', 'https://example.com'],
    ['![a](https://example.com/logo.png)', 'https://example.com/logo.png'],
  ];
  for (const [source, expected] of cases) {
    const result = carveToPandoc(source);
    assert.deepEqual(targets(result.doc), [expected], `${source}: destination changed`);
    assert.deepEqual(unsafe(result), [], `${source}: emitted a diagnostic it should not have`);
  }
});

test('corpus 108-security-hardening-6 - the spec\'s own negative control - is untouched', () => {
  const path = join(corpusDir, '108-security-hardening-6.crv');
  assert.ok(existsSync(path), '108-security-hardening-6 is gone from the corpus');
  const result = carveToPandoc(readFileSync(path, 'utf8'));
  assert.deepEqual(targets(result.doc), ['https://ok.com', 'tel:+15551234']);
  assert.deepEqual(unsafe(result), []);
});

test('a scheme-less destination is not probed as one', () => {
  for (const url of ['', '#', '#a:b', '/a:b', './a:b']) {
    assert.equal(probeScheme(url), undefined, `${JSON.stringify(url)} read as carrying a scheme`);
    assert.equal(blankDeniedDestination(url), url);
  }
});

test('an obfuscated scheme authored in Carve SOURCE is blanked', async () => {
  const { renderHtml } = await enginePolicy();
  // Not the unit battery above: these go through the parser, so they measure
  // what an AUTHOR can actually get into the AST. Corpus 121's leading
  // separator does not survive the parse - a control character inside the
  // scheme does, and that is the form a prefix check would let through.
  const DEL = '\u007F';
  const cases = [
    ['[a](java' + DEL + 'script:x)', 'link'],
    ['![a](java' + DEL + 'script:x)', 'image'],
    ['[a][r]\n\n[r]: java' + DEL + 'script:x', 'link'],
    ['[a](JaVaScRiPt:x)', 'link'],
    ['[a][r]\n\n[r]: \u202Fjavascript:x', 'link'],
  ];
  for (const [source, construct] of cases) {
    const result = carveToPandoc(source);
    assert.deepEqual(
      targets(result.doc),
      [''],
      JSON.stringify(source) + ': the destination reached pandoc',
    );
    const [diagnostic] = unsafe(result);
    assert.ok(diagnostic, JSON.stringify(source) + ': no diagnostic');
    assert.equal(diagnostic.details.construct, construct);
    // And the engine agrees, asked directly rather than assumed.
    assert.equal(engineKeeps(renderHtml, diagnostic.details.destination, construct), false);
  }
});
