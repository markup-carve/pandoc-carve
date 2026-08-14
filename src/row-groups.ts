/**
 * The optional `table.rowGroups` partition of PART 12 §15.
 *
 * The object holds COUNTS, never rows, so a grouping cannot contradict the
 * table's flat `rows` - it partitions them, head first, then each body group
 * (its own intermediate header rows, then its body rows), then the foot.
 *
 * §15 states as a MUST that those counts account for every row exactly once.
 * JSON Schema cannot express a cross-field sum, so `resources/ast-schema.json`
 * deliberately does not check it and an upstream test pins that a non-summing
 * partition still validates. A document that validates is therefore not a
 * document whose partition is coherent, and this bridge has to decide for
 * itself: a partition that does not add up is refused here rather than turned
 * into a table whose sections silently disagree with its rows.
 */

/** A body group: its intermediate header rows, its body rows, and its extras. */
export interface RowGroupBody {
    headRows: number;
    bodyRows: number;
    rowHeadColumns?: number;
    attrs?: unknown;
}

/** The whole partition: leading head rows, the body groups, trailing foot rows. */
export interface RowGroups {
    headRows: number;
    bodies: RowGroupBody[];
    footRows: number;
}

/** The outcome of reading the field: at most one of `groups` and `error` is set. */
export interface RowGroupsRead {
    groups: RowGroups | null;
    error: string | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A required count: a non-negative integer, nothing else. */
function count(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** The number of rows a partition consumes. */
export function rowGroupsTotal(groups: RowGroups): number {
    return (
        groups.headRows +
        groups.bodies.reduce((sum, b) => sum + b.headRows + b.bodyRows, 0) +
        groups.footRows
    );
}

/**
 * Read `table.rowGroups` for a table of `rowCount` rows.
 *
 * Absent is not an error: it means the implicit structure every renderer
 * already derives. Present but unusable IS one, and it is reported rather
 * than repaired, because guessing which of the counts was meant would produce
 * a table nobody wrote.
 */
export function readRowGroups(value: unknown, rowCount: number): RowGroupsRead {
    if (value === undefined || value === null) return { groups: null, error: null };
    if (!isObject(value)) return { groups: null, error: 'rowGroups is not an object' };

    const headRows = count(value['headRows']);
    const footRows = count(value['footRows']);
    if (headRows === null || footRows === null) {
        return { groups: null, error: 'rowGroups needs integer headRows and footRows of at least 0' };
    }
    if (!Array.isArray(value['bodies'])) {
        return { groups: null, error: 'rowGroups needs a bodies array (an empty one is a head-only table)' };
    }

    const bodies: RowGroupBody[] = [];
    for (const [i, raw] of (value['bodies'] as unknown[]).entries()) {
        if (!isObject(raw)) return { groups: null, error: `rowGroups body ${i + 1} is not an object` };
        const bodyHead = count(raw['headRows']);
        const bodyRows = count(raw['bodyRows']);
        if (bodyHead === null || bodyRows === null) {
            return {
                groups: null,
                error: `rowGroups body ${i + 1} needs integer headRows and bodyRows of at least 0`,
            };
        }
        const body: RowGroupBody = { headRows: bodyHead, bodyRows };
        if (raw['rowHeadColumns'] !== undefined) {
            const rowHead = count(raw['rowHeadColumns']);
            if (rowHead === null) {
                return { groups: null, error: `rowGroups body ${i + 1} has a rowHeadColumns that is not a count` };
            }
            if (rowHead > 0) body.rowHeadColumns = rowHead;
        }
        if (raw['attrs'] !== undefined) body.attrs = raw['attrs'];
        bodies.push(body);
    }

    const groups: RowGroups = { headRows, bodies, footRows };
    const total = rowGroupsTotal(groups);
    if (total !== rowCount) {
        return {
            groups: null,
            error:
                `rowGroups partitions ${total} row(s) but the table has ${rowCount} ` +
                `(head ${headRows}, ${bodies.map((b) => `body ${b.headRows}+${b.bodyRows}`).join(', ') || 'no bodies'}, foot ${footRows}). ` +
                'PART 12 §15 requires the counts to account for every row exactly once, and no schema can check that',
        };
    }
    return { groups, error: null };
}
