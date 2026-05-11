import { useMemo } from 'react';

import type { POListItem } from '@/modules/project/schemas/purchase-order';

interface UsePOCalculationsOptions {
  pos: POListItem[] | undefined;
}

export function usePOCalculations({ pos }: UsePOCalculationsOptions) {
  return useMemo(() => {
    if (!pos) {
      return {
        activePOs: [],
        totalPOCommitted: 0,
        activePOsCount: 0,
      };
    }

    // Filter out cancelled POs
    const activePOs = pos.filter((po) => po.status !== 'CANCELLED');

    // Calculate total committed from active POs
    const totalPOCommitted = activePOs.reduce(
      (sum, po) => sum + (parseFloat(po.total ?? '0') || 0),
      0
    );

    return {
      activePOs,
      totalPOCommitted,
      activePOsCount: activePOs.length,
    };
  }, [pos]);
}
