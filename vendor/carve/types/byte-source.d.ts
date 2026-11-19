import { type Node } from './ast.js';
/** The text of a source and, for bytes that are not well-formed UTF-8, those bytes and where each U+FFFD stands. */
export interface SourceText {
    text: string;
    /** Null for a string and for well-formed bytes, whose offsets the text counts as they stand. */
    bytes: Uint8Array | null;
    /** For each replaced subpart, the offset of its U+FFFD in the UTF-8 of the text and the source bytes it spans. */
    replaced: [number, number][];
}
/** C2-B-218: the text of a source; a string is read as it stands. */
export declare function sourceText(input: string | Uint8Array): SourceText;
/** C2-B-218: every position of the top-level source counts its bytes; positions in an included file are left as they are. */
export declare function mapPositions(source: SourceText, document: Node): void;
/** C2-L-056: the bytes in the base64 alphabet of RFC 4648, section 4, with padding. */
export declare function base64(bytes: Uint8Array): string;
