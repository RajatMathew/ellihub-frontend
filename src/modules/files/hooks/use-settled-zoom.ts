import { useEffect, useState } from 'react';

import { ZOOM_SETTLE_MS } from '@/modules/files/lib/preview-zoom';

/** The zoom once it has held still for `ZOOM_SETTLE_MS` — see `zoomBoxStyle`. */
export function useSettledZoom(zoom: number): number {
  const [settled, setSettled] = useState(zoom);
  useEffect(() => {
    if (zoom === settled) return;
    const timer = setTimeout(() => setSettled(zoom), ZOOM_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [zoom, settled]);
  return settled;
}
