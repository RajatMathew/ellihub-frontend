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

    const issuedPOs = pos.filter((po) => po.status === 'ISSUED');

    const totalPOCommitted = issuedPOs.reduce(
      (sum, po) => sum + (parseFloat(po.total ?? '0') || 0),
      0
    );

    return {
      activePOs: issuedPOs,
      totalPOCommitted,
      activePOsCount: issuedPOs.length,
    };
  }, [pos]);
}
