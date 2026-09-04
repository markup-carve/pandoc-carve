/*
 * PART 9 §25 on the way out to pandoc.
 *
 * Carve's writers blank a destination whose scheme the spec denies, and §25
 * binds "every target that emits a resolvable URL" - the engine's HTML,
 * Markdown and ANSI writers all do it. This bridge emits resolvable URLs too,
 * and `pandoc -f json -t html` is one command away, so a scheme passed through
 * here is not a narrower policy, it is the same sink one step removed
 * (markup-carve/pandoc-carve#157).
 *
 * THE LIST AND THE PROBE ARE MIRRORED FROM THE ENGINE, NOT INVENTED. The
 * engine keeps them in `render-html.ts` and shares them with its non-HTML
 * writers through `deny-listed-destination.ts`; its package export map reaches
 * neither, so runtime code here cannot import them and the constants below are
 * a restatement.
 *
 * test/url-scheme.test.mjs is what makes the restatement safe. It reads the
 * engine's ACTUAL list and probe out of the installed package by `file:` URL -
 * which the export map does not gate, and which a test may do where shipped
 * code should not - and compares them as SETS, in both directions. So a scheme
 * the engine ADDS goes red here too, which is the failure a check that iterated
 * only these names could never see.
 */

/**
 * Schemes Carve blanks on a link or image destination.
 *
 * The script / inline-content / local-file class, then the OS protocol-handler
 * and command-execution class (the CVE-2026-20841 group). Legitimate schemes -
 * `http`, `https`, `mailto`, `tel`, `ftp`, `sms` - and every scheme-less
 * destination pass.
 */
export const DANGEROUS_URL_SCHEMES: readonly string[] = [
    'javascript',
    'vbscript',
    'data',
    'file',
    'ms-msdt',
    'ms-office',
    'ms-word',
    'ms-excel',
    'ms-powerpoint',
    'ms-access',
    'ms-visio',
    'ms-project',
    'ms-publisher',
    'ms-infopath',
    'ms-spd',
    'ms-search',
    'search-ms',
    'ms-cxh',
    'ms-cxh-full',
    'shell',
    'vscode',
    'vscode-insiders',
    'jar',
];

/**
 * Characters dropped before the scheme is read: every control character plus
 * every Unicode whitespace character.
 *
 * A consumer may ignore any of them when it decides what the scheme is, so
 * `<U+202F>javascript:` and `java<DEL>script:` have to fail the check the plain
 * spelling fails. Corpus `121-scheme-probe-strips-unicode-whitespace` pins the
 * first of those, and a `startsWith('javascript:')` check passes that document
 * while leaving the hole wide open.
 */
export const SCHEME_PROBE_STRIP_RE = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f\s]+/gu;

const DENIED = new Set(DANGEROUS_URL_SCHEMES.map((scheme) => scheme.toLowerCase()));

/** The scheme a consumer would read off `url`, lowercased, or undefined. */
export function probeScheme(url: string): string | undefined {
    const probe = url.replace(SCHEME_PROBE_STRIP_RE, '');
    const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe);
    return match?.[1]?.toLowerCase();
}

/** Whether `url` carries a scheme §25 denies. */
export function hasDeniedScheme(url: string): boolean {
    const scheme = probeScheme(url);
    return scheme !== undefined && DENIED.has(scheme);
}

/** `url`, or `''` when its scheme is denied. */
export function blankDeniedDestination(url: string): string {
    return hasDeniedScheme(url) ? '' : url;
}
