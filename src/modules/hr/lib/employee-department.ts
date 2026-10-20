/**
 * The department an employee save should send.
 *
 * The API reads an absent `departmentId` as "leave it as it is", `null` as
 * "take them out of their department" and an id as "move them there" — and
 * changing it needs `department:update`. So the form sends it only when it
 * changed: a save that did not touch the department never moves anyone, and
 * never needs that permission.
 */
export function employeeDepartmentChange(
  original: string | null | undefined,
  selected: string | null | undefined
): string | null | undefined {
  const from = original || null;
  const to = selected || null;
  return from === to ? undefined : to;
}
