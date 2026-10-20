/**
 * The project board's division columns: the standard ones, always shown in
 * this order, and the division labels each one gathers.
 *
 * The division DDC was renamed General (elli-core migration
 * `20261010120100_division_general_and_unit_foot`); the old label still lands
 * in the same column, so a project read before or after the rename shows in
 * one place.
 */
export const STANDARD_DIVISIONS: ReadonlyArray<{ label: string; keys: readonly string[] }> = [
  { label: 'SCA', keys: ['SCA'] },
  { label: 'Institutional', keys: ['INSTITUTIONAL'] },
  { label: 'General', keys: ['GENERAL', 'DDC', 'PUBLIC'] },
  { label: 'Public / State', keys: ['PUBLIC / STATE', 'PUBLIC STATE', 'CIVIL'] },
];

export const STANDARD_DIVISION_LABELS = new Set(
  STANDARD_DIVISIONS.map((division) => division.label)
);

const normalizeDivisionLabel = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toUpperCase();

/** The column a division label belongs in: a standard one, or its own. */
export function divisionColumnLabel(label: string): string {
  const normalizedLabel = normalizeDivisionLabel(label);
  const standardDivision = STANDARD_DIVISIONS.find((division) =>
    division.keys.includes(normalizedLabel)
  );

  return standardDivision?.label ?? label;
}
