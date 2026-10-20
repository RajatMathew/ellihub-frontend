import { useEffect, useRef } from 'react';

import { findLinesWithoutUnit } from '@/modules/project/lib/line-item-defaults';

/**
 * Gives every line without a unit the default one.
 *
 * The units load after the form opens, and lines arrive later still - added,
 * or filled in from an RFQ - so this runs whenever either changes, not once.
 * A line whose unit was chosen is never touched; the unit picker cannot be
 * cleared, so a blank unit always means "not chosen yet".
 */
export function useDefaultLineItemUnit(
  lines: readonly { unitId?: string | null }[] | undefined,
  defaultUnitId: string | undefined,
  setUnit: (index: number, unitId: string) => void
) {
  const setUnitRef = useRef(setUnit);
  useEffect(() => {
    setUnitRef.current = setUnit;
  });

  const linesWithoutUnit = findLinesWithoutUnit(lines).join(',');

  useEffect(() => {
    if (!defaultUnitId || !linesWithoutUnit) return;
    for (const index of linesWithoutUnit.split(',')) {
      setUnitRef.current(Number(index), defaultUnitId);
    }
  }, [defaultUnitId, linesWithoutUnit]);
}
