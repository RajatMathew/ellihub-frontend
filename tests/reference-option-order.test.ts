import { describe, expect, test } from 'bun:test';

import {
  orderOptionsBySelection,
  type EntityReference,
} from '../src/app/components/entity-reference-marker-storage';

const option = (label: string, entityId: string | null = label.toLowerCase()) => ({
  type: 'project' as const,
  entityType: 'project' as const,
  entityId,
  label,
  meta: null,
});

const picked = (label: string, entityId: string | null = label.toLowerCase()): EntityReference => ({
  type: 'project',
  entityType: 'project',
  entityId,
  label,
});

describe('orderOptionsBySelection', () => {
  test('pins picked options in the order they were picked, not alphabetically', () => {
    // The fetched page arrives alphabetically; the click order is different.
    const options = [
      option('Astoria Hall'),
      option('Brooklyn Public Library'),
      option('Chelsea Yard'),
      option('Dumbo Loft'),
    ];
    const selected = [
      picked('Dumbo Loft'),
      picked('Astoria Hall'),
      picked('Chelsea Yard'),
      picked('Brooklyn Public Library'),
    ];

    expect(orderOptionsBySelection(options, selected).map((item) => item.label)).toEqual([
      'Dumbo Loft',
      'Astoria Hall',
      'Chelsea Yard',
      // Picked last, so it sits fourth — this is the case #1041 named.
      'Brooklyn Public Library',
    ]);
  });

  test('leaves the unpicked tail in the order the server sent it', () => {
    const options = [
      option('Astoria Hall'),
      option('Brooklyn Public Library'),
      option('Chelsea Yard'),
    ];
    const selected = [picked('Chelsea Yard')];

    expect(orderOptionsBySelection(options, selected).map((item) => item.label)).toEqual([
      'Chelsea Yard',
      'Astoria Hall',
      'Brooklyn Public Library',
    ]);
  });

  test('matches a manually entered reference by label when it has no id', () => {
    const options = [option('RFI-112', null), option('RFI-113', null)];
    const selected = [
      { type: 'project' as const, entityType: null, entityId: null, label: 'rfi-113' },
    ];

    expect(orderOptionsBySelection(options, selected).map((item) => item.label)).toEqual([
      'RFI-113',
      'RFI-112',
    ]);
  });

  test('nothing picked leaves the list exactly as it arrived', () => {
    const options = [option('Astoria Hall'), option('Brooklyn Public Library')];

    expect(orderOptionsBySelection(options, []).map((item) => item.label)).toEqual([
      'Astoria Hall',
      'Brooklyn Public Library',
    ]);
  });
});
