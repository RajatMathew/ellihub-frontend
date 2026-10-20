import { describe, expect, test } from 'bun:test';

import { PROJECT_DIVISION_OPTIONS } from '../src/modules/project/constants/project.constants';
import {
  divisionColumnLabel,
  STANDARD_DIVISIONS,
} from '../src/modules/project/lib/division-columns';
import { divisionSchema } from '../src/modules/project/schemas/project.schema';

/**
 * The division DDC was renamed General. A project whose division reads
 * General must land in the board's General column - not in a stray column of
 * its own beside an empty one - and so must one still read as DDC.
 */
describe('the project board', () => {
  test('puts the General division in the General column', () => {
    expect(divisionColumnLabel('General')).toBe('General');
    expect(divisionColumnLabel('  general ')).toBe('General');
  });

  test('puts a project still labelled DDC in the same column', () => {
    expect(divisionColumnLabel('DDC')).toBe('General');
  });

  test('shows General among its standard columns, and no DDC one', () => {
    const columns = STANDARD_DIVISIONS.map((division) => division.label);

    expect(columns).toContain('General');
    expect(columns).not.toContain('DDC');
    expect(divisionColumnLabel('CIVIL')).toBe('Public / State');
    expect(divisionColumnLabel('Something new')).toBe('Something new');
  });
});

describe('the division filter', () => {
  test('offers General, not DDC', () => {
    expect(PROJECT_DIVISION_OPTIONS.map((option) => option.label)).toContain('General');
    expect(divisionSchema.safeParse('DDC').success).toBe(false);
    expect(divisionSchema.parse('GENERAL')).toBe('GENERAL');
  });
});
