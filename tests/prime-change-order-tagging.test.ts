import { describe, expect, test } from 'bun:test';

import {
  ENTITY_REFERENCE_CATEGORIES,
  getReferenceKind,
  groupReferencesByType,
  manualReferenceType,
  type EntityReferenceApi,
} from '../src/app/components/entity-reference-marker-storage';
import {
  fetchAllReferenceOptions,
  fetchReferenceOptionsOfType,
} from '../src/app/components/entity-reference-options-query';
import { linkedItemViews } from '../src/modules/email/lib/linked-item-views';
import { RECORD_TABS, RECORD_TAG } from '../src/modules/email/lib/record-links';

/**
 * elli-ui#1163: prime change orders can be tagged on a thread, a task and a
 * calendar event as their own kind of record.
 *
 * They were stored, and searched, as `changeOrder` alongside sub change orders,
 * under a tab and a tag both reading "SCO" — so a prime change order was never
 * offered as one, and one that was linked read as an SCO.
 */

const primeOption = {
  type: 'changeOrder' as const,
  entityType: 'primeChangeOrder' as const,
  entityId: 'pco-1',
  label: 'PCO-7 - Added lobby lighting',
  meta: null,
};
const subOption = {
  type: 'changeOrder' as const,
  entityType: 'subChangeOrder' as const,
  entityId: 'sco-1',
  label: 'SCO-3 - Extra framing',
  meta: null,
};

function recordingApi(options: unknown[] = []) {
  const calls: { types: string[] }[] = [];
  const api = {
    listOptions: (params: { types: string[] }) => {
      calls.push(params);
      return Promise.resolve(options);
    },
  } as unknown as EntityReferenceApi;
  return { api, calls };
}

describe('the thread reference picker', () => {
  test('offers a Prime CO tab beside SCO', () => {
    const tabs = ENTITY_REFERENCE_CATEGORIES.map((category) => [category.type, category.label]);
    expect(tabs).toContainEqual(['primeChangeOrder', 'Prime CO']);
    expect(tabs).toContainEqual(['changeOrder', 'SCO']);
  });

  test('the Prime CO tab asks for prime change orders, the SCO tab for sub ones only', async () => {
    const { api, calls } = recordingApi();
    await fetchReferenceOptionsOfType(api, {
      scopeId: 'acct-1',
      type: 'primeChangeOrder',
      projectIds: ['p1'],
    });
    await fetchReferenceOptionsOfType(api, {
      scopeId: 'acct-1',
      type: 'changeOrder',
      projectIds: ['p1'],
    });
    expect(calls.map((call) => call.types)).toEqual([['primeChangeOrder'], ['subChangeOrder']]);
  });

  test('the All tab labels each change order by what it is', async () => {
    const { api } = recordingApi([primeOption, subOption]);
    const options = await fetchAllReferenceOptions(api, {
      scopeId: 'acct-1',
      types: ['primeChangeOrder', 'changeOrder'],
      projectIds: ['p1'],
    });
    expect(options.map((option) => option.groupLabel)).toEqual(['Prime CO', 'SCO']);
  });

  test('a picked prime change order is still saved as a changeOrder reference', () => {
    // The API and every client before this one store it that way.
    expect(getReferenceKind(primeOption)).toBe('primeChangeOrder');
    expect(getReferenceKind(subOption)).toBe('changeOrder');
    expect(getReferenceKind({ type: 'changeOrder', entityType: null })).toBe('changeOrder');
  });

  test('a linked prime change order is grouped apart from the SCOs', () => {
    const groups = groupReferencesByType([primeOption, subOption]);
    expect(groups.map((group) => group.type)).toEqual(['primeChangeOrder', 'changeOrder']);
  });

  test('a prime change order cannot be typed in by hand, since it would save as an SCO', () => {
    expect(manualReferenceType('primeChangeOrder')).toBeNull();
    expect(manualReferenceType('changeOrder')).toBe('changeOrder');
  });

  test('the inbox row and task card name a prime change order as one', () => {
    const { shown } = linkedItemViews([subOption, primeOption], Infinity);
    expect(shown.map((view) => view.typeLabel)).toEqual(['PRIME CO', 'SCO']);
  });
});

describe('the task and calendar event record picker', () => {
  test('has its own Prime COs tab, and SCOs apart', () => {
    const tab = (id: string) => RECORD_TABS.find((item) => item.id === id);
    expect(tab('primeChangeOrder')?.types).toEqual(['primeChangeOrder']);
    expect(tab('subChangeOrder')?.types).toEqual(['subChangeOrder']);
    expect(RECORD_TABS[0].types).toContain('primeChangeOrder');
  });

  test('tags a linked prime change order "Prime CO"', () => {
    expect(RECORD_TAG.primeChangeOrder.label).toBe('Prime CO');
  });
});
