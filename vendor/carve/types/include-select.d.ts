import { type DocumentNode } from './ast.js';
import { type ParsedTree } from './ast-blocks.js';
import { type Findings } from './diagnostics.js';
import { type Selected } from './expand.js';
import { type HeadingIds } from './options.js';
/** C2-N-027 to C2-N-031: the selected blocks, then every definition of the file the selection did not take. */
export declare function selectSection(parsed: ParsedTree, name: string, mode: HeadingIds): Selected | null;
/** C2-N-048 to C2-N-051: the shifts of an expanded tree. */
export declare function applyShifts(document: DocumentNode, findings: Findings): void;
