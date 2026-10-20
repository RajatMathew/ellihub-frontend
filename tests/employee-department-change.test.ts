import { describe, expect, test } from 'bun:test';

import { employeeDepartmentChange } from '../src/modules/hr/lib/employee-department';

/**
 * What an employee save sends as departmentId. The API reads absent as "leave
 * it", null as "take them out" and an id as "move them" — and a change needs
 * department:update — so the form sends it only when it changed.
 */

describe('the department an employee save sends', () => {
  test('nothing, when the department was not touched', () => {
    expect(employeeDepartmentChange('dept-eng', 'dept-eng')).toBeUndefined();
    expect(employeeDepartmentChange(null, null)).toBeUndefined();
  });

  test('nothing, when "none" is spelled differently on each side', () => {
    expect(employeeDepartmentChange(undefined, null)).toBeUndefined();
    expect(employeeDepartmentChange(null, '')).toBeUndefined();
  });

  test('the new department, when one was picked or changed', () => {
    expect(employeeDepartmentChange(null, 'dept-eng')).toBe('dept-eng');
    expect(employeeDepartmentChange('dept-eng', 'dept-ops')).toBe('dept-ops');
  });

  test('null, when the department was cleared', () => {
    expect(employeeDepartmentChange('dept-eng', null)).toBeNull();
    expect(employeeDepartmentChange('dept-eng', '')).toBeNull();
  });
});
