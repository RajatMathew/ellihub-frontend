import { useCallback, useMemo, useState, type ReactNode } from 'react';

import {
  BreadcrumbLabelsContext,
  BreadcrumbTrailContext,
  type BreadcrumbTrailEntry,
} from '@/app/contexts/breadcrumbs';

export function BreadcrumbLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [trail, setTrail] = useState<BreadcrumbTrailEntry[] | null>(null);

  const setLabel = useCallback((path: string, label?: string) => {
    setLabels((current) => {
      if (label && current[path] === label) {
        return current;
      }

      if (!label) {
        if (!(path in current)) {
          return current;
        }

        const next = { ...current };
        delete next[path];
        return next;
      }

      return { ...current, [path]: label };
    });
  }, []);

  const value = useMemo(() => ({ labels, setLabel }), [labels, setLabel]);
  const trailValue = useMemo(() => ({ trail, setTrail }), [trail]);

  return (
    <BreadcrumbLabelsContext.Provider value={value}>
      <BreadcrumbTrailContext.Provider value={trailValue}>
        {children}
      </BreadcrumbTrailContext.Provider>
    </BreadcrumbLabelsContext.Provider>
  );
}
