/** URL policy shared with the Carve engine. */
import { DEFAULT_DENIED_SCHEMES, urlScheme } from '../vendor/carve/index.js';

export const DANGEROUS_URL_SCHEMES: readonly string[] = DEFAULT_DENIED_SCHEMES;
export const probeScheme = (url: string): string | undefined => urlScheme(url) || undefined;
export const hasDeniedScheme = (url: string): boolean => {
    const scheme = probeScheme(url);
    return scheme !== undefined && DEFAULT_DENIED_SCHEMES.includes(scheme);
};
export const blankDeniedDestination = (url: string): string => hasDeniedScheme(url) ? '' : url;
