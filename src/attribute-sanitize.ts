import { DANGEROUS_URL_SCHEMES, SCHEME_PROBE_STRIP_RE } from './url-scheme.js';

/** Attribute names Carve never emits, regardless of value. */
export const DANGEROUS_ATTR_NAMES: readonly string[] = ['srcdoc', 'formaction'];

const DANGEROUS_NAMES = new Set(DANGEROUS_ATTR_NAMES);
const DANGEROUS_VALUE_SCHEMES = new Set(DANGEROUS_URL_SCHEMES);
const ASCII_WHITESPACE = '\\t\\n\\f\\r ';
const URL_LIST_SEPARATORS = new Map([
    ['srcset', new RegExp(`[,${ASCII_WHITESPACE}]+`)],
    ['imagesrcset', new RegExp(`[,${ASCII_WHITESPACE}]+`)],
    ['ping', new RegExp(`[${ASCII_WHITESPACE}]+`)],
    ['attributionsrc', new RegExp(`[${ASCII_WHITESPACE}]+`)],
]);

/** Mirror of Carve's always-on PART 9 §25 attribute-name policy. */
export function isDangerousAttrName(name: string): boolean {
    const normalized = name.toLowerCase();
    return normalized.startsWith('on') || DANGEROUS_NAMES.has(normalized);
}

function hasDeniedValueScheme(value: string): boolean {
    const colon = value.indexOf(':');
    if (colon === -1) return false;
    const scheme = value.slice(0, colon).replace(SCHEME_PROBE_STRIP_RE, '').toLowerCase();
    return DANGEROUS_VALUE_SCHEMES.has(scheme);
}

function decodeCssEscapes(value: string): string {
    return value.replace(/\\([0-9a-f]{1,6}\s?|[\s\S])/gi, (_match, escape: string) => {
        if (!/^[0-9a-f]/i.test(escape)) return escape;
        const codePoint = Number.parseInt(escape.trim(), 16);
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
            ? String.fromCodePoint(codePoint)
            : '';
    });
}

function hasDangerousCss(value: string): boolean {
    const compact = decodeCssEscapes(value.replace(/\/\*[\s\S]*?\*\//g, ''))
        .toLowerCase()
        .replace(/\s+/g, '');
    return compact.includes('expression(')
        || compact.includes('url(')
        || compact.includes('@import')
        || compact.includes('behavior:')
        || compact.includes('-moz-binding');
}

/** Mirror of Carve's always-on PART 9 §25 attribute-value policy. */
export function renderedAttrValue(name: string, value: string): string {
    if (hasDeniedValueScheme(value)) return '';
    const separator = URL_LIST_SEPARATORS.get(name.toLowerCase());
    if (separator && value.split(separator).some((part) => part !== '' && hasDeniedValueScheme(part))) return '';
    if (name.toLowerCase() === 'style' && hasDangerousCss(value)) return '';
    return value;
}
