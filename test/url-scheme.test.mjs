import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DENIED_SCHEMES, isUrlAllowed, urlScheme } from '../vendor/carve/index.js';
import { carveToPandoc } from '../dist/index.js';
import { DANGEROUS_URL_SCHEMES, probeScheme, hasDeniedScheme, blankDeniedDestination } from '../dist/url-scheme.js';

const targets = value => Array.isArray(value) ? value.flatMap(targets) : !value || typeof value !== 'object' ? [] : (value.t === 'Link' || value.t === 'Image') ? [value.c[2][0], ...targets(value.c[1])] : targets(value.c);
const obfuscated = [
  '\u202Fjavascript:alert(1)', '\u00A0javascript:alert(1)', '\uFEFFjavascript:alert(1)',
  '\u3000javascript:alert(1)', '\u2028javascript:alert(1)', ' \tjavascript:alert(1)',
  'java\u007Fscript:alert(1)', 'java\u0001script:alert(1)', 'java\u0085script:alert(1)',
  'JaVaScRiPt:alert(1)', '\u00A0JAVASCRIPT:alert(1)', 'ms-msdt:/id', 'SHELL:Startup', 'ms\u00A0-msdt:/id',
];
const legitimate = [
  'https://example.com/a?b=1&c=2', 'http://example.com', 'mailto:someone@example.com',
  'tel:+15551234', 'ftp://example.com/x', 'sms:+15551234', '/relative/path',
  'relative/path', '?query=1', '#fragment', '//protocol-relative.example.com/x',
  'javascriptish://example.com', 'x-javascript://example.com',
];

test('the bridge uses exactly the engine URL policy and scheme parser', () => {
  assert.deepEqual([...DANGEROUS_URL_SCHEMES].sort(), [...DEFAULT_DENIED_SCHEMES].sort());
  for (const destination of [...obfuscated, ...legitimate]) {
    assert.equal(probeScheme(destination), urlScheme(destination) || undefined, destination);
    assert.equal(hasDeniedScheme(destination), !isUrlAllowed(destination), destination);
    assert.equal(blankDeniedDestination(destination), isUrlAllowed(destination) ? destination : '', destination);
  }
});

test('obfuscated dangerous destinations are blanked for links and images', () => {
  for (const destination of obfuscated) {
    for (const type of ['link', 'image']) {
      const source = type === 'link' ? `[x](${destination})` : `![x](${destination})`;
      const result = carveToPandoc(source);
      if (targets(result.doc).length === 0) continue; // source parser rejected the spelling
      assert.deepEqual(targets(result.doc), [''], `${type}: ${destination}`);
      assert.match(result.warnings.join('\n'), /destination-denied/);
    }
  }
});

test('ordinary and scheme-less destinations pass unchanged', () => {
  for (const destination of legitimate) {
    const result = carveToPandoc(`[x](${destination})`);
    if (targets(result.doc).length === 0) continue;
    assert.deepEqual(targets(result.doc), [destination]);
    assert.ok(!result.warnings.some(warning => warning.includes('destination-denied')));
  }
});
