import { describe, expect, test } from 'bun:test';

import type { EntityReferenceApi } from '../src/app/components/entity-reference-marker-storage';
import {
  dedupeReferenceOptions,
  projectReferenceOptionsQuery,
} from '../src/app/components/entity-reference-options-query';

const option = (over: Record<string, unknown> = {}) => ({
  type: 'project' as const,
  entityType: 'project' as const,
  entityId: 'p1',
  label: '2026-001 - Testing',
  meta: null,
  ...over,
});

describe('warming the reference picker', () => {
  test('asks for exactly the key the picker reads', () => {
    // If these drift the prefetch writes a cache entry nothing reads, and the
    // picker still opens empty while it fires the same request again.
    expect(projectReferenceOptionsQuery('acct-1', {} as EntityReferenceApi).queryKey).toEqual([
      'entity-reference-options',
      'acct-1',
      'project',
      [],
      '',
    ]);
  });

  test('requests the unfiltered project list', async () => {
    const calls: unknown[] = [];
    const api = {
      listOptions: (params: unknown) => {
        calls.push(params);
        return Promise.resolve([option()]);
      },
    } as unknown as EntityReferenceApi;

    const result = await projectReferenceOptionsQuery('acct-1', api).queryFn();
    expect(calls).toEqual([
      { scopeId: 'acct-1', type: 'project', projectId: undefined, search: undefined },
    ]);
    expect(result).toHaveLength(1);
  });

  test('dedupes the way the picker does, so the warmed entry matches', async () => {
    const api = {
      listOptions: () => Promise.resolve([option(), option(), option({ entityId: 'p2' })]),
    } as unknown as EntityReferenceApi;

    const result = await projectReferenceOptionsQuery('acct-1', api).queryFn();
    expect(result.map((item) => item.entityId)).toEqual(['p1', 'p2']);
  });
});

describe('deduping reference options', () => {
  test('keeps the first of a repeated record and preserves order', () => {
    const deduped = dedupeReferenceOptions([
      option({ entityId: 'a', label: 'first' }),
      option({ entityId: 'b' }),
      option({ entityId: 'a', label: 'second' }),
    ]);
    expect(deduped.map((item) => item.label)).toEqual(['first', '2026-001 - Testing']);
  });

  test('falls back to the label when a record has no id', () => {
    const deduped = dedupeReferenceOptions([
      option({ entityId: null, label: 'Manual entry' }),
      option({ entityId: null, label: 'Manual entry' }),
      option({ entityId: null, label: 'Another' }),
    ]);
    expect(deduped).toHaveLength(2);
  });
});
