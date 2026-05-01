import { useContext, useEffect } from 'react';

import { BreadcrumbLabelsContext } from '@/app/contexts/breadcrumbs';

export function useBreadcrumbLabel(path: string | undefined, label: string | undefined) {
  const context = useContext(BreadcrumbLabelsContext);
  const setLabel = context?.setLabel;

  useEffect(() => {
    if (!setLabel || !path) return;

    setLabel(path, label);
    return () => setLabel(path, undefined);
  }, [label, path, setLabel]);
}

export function useBreadcrumbLabels() {
  const context = useContext(BreadcrumbLabelsContext);
  return context?.labels ?? {};
}
