import { useCallback } from 'react';

import { useSearchParams } from 'react-router-dom';

export type UrlParamPatch = Record<string, string | null | undefined>;

export function useUrlParamPatch() {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateParams = useCallback(
    (patch: UrlParamPatch) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);

        Object.entries(patch).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            next.delete(key);
            return;
          }

          next.set(key, value);
        });

        return next;
      });
    },
    [setSearchParams]
  );

  return { searchParams, updateParams };
}
