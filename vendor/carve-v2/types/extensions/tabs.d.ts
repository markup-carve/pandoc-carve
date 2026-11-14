import { type ExtensionDefinition, type ExtensionRenderer } from './types.js';
/** C2-X-039 to C2-X-042: the standard extension uses the same registration shape as a host extension. */
export declare const tabExtension: ExtensionDefinition;
export declare const tabsExtension: ExtensionDefinition;
export declare const tabsExtensions: readonly ExtensionDefinition[];
/** C2-X-043 to C2-X-048: all panel content is present in static HTML. */
export declare const tabsRenderer: ExtensionRenderer;
