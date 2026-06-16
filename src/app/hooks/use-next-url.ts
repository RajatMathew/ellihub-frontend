import { useLocation } from 'react-router-dom';

export function useNextUrl() {
  const { pathname, search, hash } = useLocation();

  return {
    pathname,
    search,
    hash,
    fullUrl: pathname + search + hash,
    nextUrl: encodeURIComponent(pathname + search + hash),
  };
}
