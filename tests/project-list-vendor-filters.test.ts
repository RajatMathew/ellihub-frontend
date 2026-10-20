import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';

import { f, withPickerData } from '../src/app/components/data-table/filters';

// The API client needs two things only a Vite build provides: the PWA
// register module and the `__APP_VERSION__` constant. Both are stood in for
// before the client loads.
mock.module('virtual:pwa-register', () => ({ registerSW: () => async () => {} }));
Object.assign(globalThis, { __APP_VERSION__: 'test' });

const { default: api } = await import('../src/app/api');
const { rfqApi } = await import('../src/modules/project/api/rfq/rfq.api');
const { scoApi } = await import('../src/modules/project/api/sub-change-order/sub-change-order.api');

/**
 * The vendor filter on the RFQ and sub change order lists, and the purchase
 * order filter on the SCO list.
 *
 * Each list builds its request by copying the keys it knows; a key it forgets is
 * dropped silently, so the picker would change the URL and the chip but never
 * the rows.
 */

const EMPTY_PAGE = {
  data: {
    data: [],
    pagination: {
      currentPage: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      itemsPerPage: 25,
      totalItems: 0,
      totalPages: 0,
    },
  },
};

const spies: { mockRestore: () => void }[] = [];
afterEach(() => spies.splice(0).forEach((spy) => spy.mockRestore()));

function recordRequests() {
  const get = spyOn(api, 'get').mockResolvedValue(EMPTY_PAGE as never);
  spies.push(get);
  return () => get.mock.calls.map(([, config]) => (config as { params: object }).params);
}

describe('the RFQ list request', () => {
  test('sends the chosen vendors', async () => {
    const requests = recordRequests();

    await rfqApi.list({ projectId: 'proj0001', vendorId: 'vend0001,vend0002' });

    expect(requests()[0]).toMatchObject({ projectId: 'proj0001', vendorId: 'vend0001,vend0002' });
  });

  test('sends no vendor when none is chosen', async () => {
    const requests = recordRequests();

    await rfqApi.list({ projectId: 'proj0001' });

    expect(requests()[0]).not.toHaveProperty('vendorId');
  });
});

describe('the sub change order list request', () => {
  test('sends the chosen vendors and purchase orders', async () => {
    const requests = recordRequests();

    await scoApi.list({
      projectId: 'proj0001',
      purchaseOrderId: 'po000001,po000002',
      vendorId: 'vend0001',
    });

    expect(requests()[0]).toMatchObject({
      purchaseOrderId: 'po000001,po000002',
      vendorId: 'vend0001',
    });
  });
});

describe('attaching a picker to a filter declared without its data', () => {
  const shell = f.infiniteMultiSelect({
    key: 'vendorId',
    onSearchChange: () => {},
    options: [],
    placeholder: 'All Vendors',
    search: '',
  });
  const picker = {
    hasNextPage: true,
    isFetchingNextPage: false,
    isLoading: false,
    onFetchNextPage: () => {},
    options: [{ label: 'Acme Steel', value: 'aaaaaaaa' }],
    selectedOptions: [{ label: 'Borden Glass', value: 'bbbbbbbb' }],
  };

  test('keeps the key and placeholder and carries the live options', () => {
    const filter = withPickerData(shell, picker, 'acm', () => {});

    expect(filter).toMatchObject({
      hasNextPage: true,
      key: 'vendorId',
      kind: 'infiniteMultiSelect',
      options: picker.options,
      placeholder: 'All Vendors',
      search: 'acm',
      selectedOptions: picker.selectedOptions,
    });
    expect(shell.options).toEqual([]);
  });

  test("clearing the filter empties the picker's search box", () => {
    const searches: string[] = [];
    const filter = withPickerData(shell, picker, 'acm', (value) => searches.push(value));

    filter.onClear?.();

    expect(searches).toEqual(['']);
  });
});
