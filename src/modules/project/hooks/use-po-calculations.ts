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

    const committedPOs = pos.filter((po) => po.status === 'ISSUED' || po.status === 'DELIVERED');

    const totalPOCommitted = committedPOs.reduce(
      (sum, po) => sum + (parseFloat(po.total ?? '0') || 0),
      0
    );

    return {
      activePOs: committedPOs,
      totalPOCommitted,
      activePOsCount: committedPOs.length,
    };
  }, [pos]);
}
