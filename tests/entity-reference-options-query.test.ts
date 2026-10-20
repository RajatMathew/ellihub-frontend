import { describe, expect, test } from 'bun:test';

import type { EntityReferenceApi } from '../src/app/components/entity-reference-marker-storage';
import {
  dedupeReferenceOptions,
  fetchAllReferenceOptions,
  fetchReferenceOptionsOfType,
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
    expect(calls).toEqual([{ scopeId: 'acct-1', types: ['project'], signal: undefined }]);
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

/** An api that records every call and answers with the given rows. */
function recordingApi(rows: ReturnType<typeof option>[] = []) {
  const calls: Parameters<EntityReferenceApi['listOptions']>[0][] = [];
  const api: EntityReferenceApi = {
    listOptions: (params) => {
      calls.push(params);
      return Promise.resolve(rows);
    },
  };
  return { api, calls };
}

describe('the All tab', () => {
  const types = ['project', 'rfq', 'purchaseOrder', 'changeOrder', 'invoice'] as const;
  const projectIds = ['p1', 'p2', 'p3', 'p4', 'p5'];

  test('asks once for every type and every linked project', async () => {
    // It was one request per type per project: 21 with five projects linked.
    const { api, calls } = recordingApi();
    await fetchAllReferenceOptions(api, { scopeId: 'acct-1', types: [...types], projectIds });

    expect(calls).toHaveLength(1);
    // The SCO tab's `changeOrder` is sent as `subChangeOrder`: prime change
    // orders have a tab of their own (elli-ui#1163).
    expect(calls[0]).toMatchObject({
      scopeId: 'acct-1',
      types: ['project', 'rfq', 'purchaseOrder', 'subChangeOrder', 'invoice'],
      projectIds,
      size: 20,
    });
  });

  test('labels each row by its own type, now that one answer mixes them', async () => {
    const { api } = recordingApi([
      option({ entityId: 'p1' }),
      option({ type: 'invoice', entityType: 'invoice', entityId: 'i1' }),
    ]);
    const result = await fetchAllReferenceOptions(api, {
      scopeId: 'acct-1',
      types: [...types],
      projectIds,
    });

    expect(result.map((row) => row.groupLabel)).toEqual(['Project', 'Invoice']);
  });

  test('passes the abort signal through, so a replaced request is cancelled', async () => {
    const { api, calls } = recordingApi();
    const controller = new AbortController();
    await fetchAllReferenceOptions(api, {
      scopeId: 'acct-1',
      types: ['rfq'],
      projectIds,
      signal: controller.signal,
    });

    expect(calls[0]?.signal).toBe(controller.signal);
  });

  test('an empty search is no search', async () => {
    const { api, calls } = recordingApi();
    await fetchAllReferenceOptions(api, { scopeId: 'a', types: ['rfq'], projectIds, search: '' });
    expect(calls[0]?.search).toBeUndefined();
  });
});

describe('a single-type tab', () => {
  test('scopes to every linked project in one request', async () => {
    const { api, calls } = recordingApi();
    await fetchReferenceOptionsOfType(api, {
      scopeId: 'acct-1',
      type: 'rfq',
      projectIds: ['p1', 'p2', 'p3'],
      search: 'roof',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      types: ['rfq'],
      projectIds: ['p1', 'p2', 'p3'],
      search: 'roof',
    });
  });

  test('the Project tab is never scoped by project', async () => {
    const { api, calls } = recordingApi();
    await fetchReferenceOptionsOfType(api, { scopeId: 'a', type: 'project', projectIds: ['p1'] });
    expect(calls[0]?.projectIds).toBeUndefined();
  });
});
