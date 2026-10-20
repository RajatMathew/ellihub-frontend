/**
 * What a new PO or SCO line starts with.
 *
 * The unit is the UNIT lookup labelled EACH - the unit on almost every line -
 * found by label, since its id differs per environment. A line from an RFQ
 * deliverable keeps the deliverable's unit; only a line with none falls back.
 */
export const DEFAULT_LINE_ITEM_UNIT_LABEL = 'EACH';

export function findDefaultLineItemUnitId(
  units: readonly { id: string; label?: string | null }[] | undefined
): string | undefined {
  return units?.find((unit) => unit.label?.trim().toUpperCase() === DEFAULT_LINE_ITEM_UNIT_LABEL)
    ?.id;
}

/** Positions of the lines no unit has been chosen for yet. */
export function findLinesWithoutUnit(
  lines: readonly { unitId?: string | null }[] | undefined
): number[] {
  return (lines ?? []).flatMap((line, index) => (line.unitId ? [] : [index]));
}
