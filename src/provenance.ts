import type { Attr } from './pandoc.js';

export const PROVENANCE_CLASS = 'carve-provenance';
const PROVENANCE_KEY = 'data-carve-provenance';
const MAX_ENCODED_BYTES = 1024 * 1024;

export interface ProvenancePayload {
    v: 1;
    kind: 'comment' | 'unknown-inline' | 'unknown-block' | 'citation';
    node: Record<string, unknown>;
}

export function provenanceAttr(kind: ProvenancePayload['kind'], node: Record<string, unknown>): Attr {
    const json = JSON.stringify({ v: 1, kind, node } satisfies ProvenancePayload);
    return ['', [PROVENANCE_CLASS], [[PROVENANCE_KEY, Buffer.from(json).toString('base64url')]]];
}

export function readProvenance(attr: Attr | undefined): ProvenancePayload | null {
    if (!attr) return null;
    const [id, classes, pairs] = attr;
    if (id !== '' || classes.length !== 1 || classes[0] !== PROVENANCE_CLASS || pairs.length !== 1 || pairs[0]?.[0] !== PROVENANCE_KEY) return null;
    if (pairs[0][1].length > MAX_ENCODED_BYTES * 2) return null;
    try {
        const decoded = Buffer.from(pairs[0][1], 'base64url');
        if (decoded.byteLength > MAX_ENCODED_BYTES) return null;
        const value = JSON.parse(decoded.toString('utf8')) as unknown;
        if (!value || typeof value !== 'object') return null;
        const payload = value as Partial<ProvenancePayload>;
        if (payload.v !== 1 || !['comment', 'unknown-inline', 'unknown-block', 'citation'].includes(String(payload.kind)) || !payload.node || typeof payload.node !== 'object' || Array.isArray(payload.node)) return null;
        return payload as ProvenancePayload;
    } catch {
        return null;
    }
}
