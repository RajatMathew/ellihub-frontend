import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { useLocation } from 'react-router-dom';

const DETAIL_SIDEBAR_DESKTOP_QUERY = '(min-width: 1024px)';

interface MobileSidebarState {
  open: boolean;
  pathname: string;
}

function getIsDesktop() {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.matchMedia(DETAIL_SIDEBAR_DESKTOP_QUERY).matches;
}

export function useResponsiveDetailSidebar(
  defaultDesktopOpen = true
): readonly [boolean, Dispatch<SetStateAction<boolean>>] {
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const [desktopOpen, setDesktopOpen] = useState(defaultDesktopOpen);
  const [mobileState, setMobileState] = useState<MobileSidebarState>({
    open: false,
    pathname: '',
  });

  const mobileOpen = mobileState.open && mobileState.pathname === location.pathname;

  useEffect(() => {
    const query = window.matchMedia(DETAIL_SIDEBAR_DESKTOP_QUERY);
    const updateIsDesktop = () => setIsDesktop(query.matches);

    updateIsDesktop();
    query.addEventListener('change', updateIsDesktop);

    return () => query.removeEventListener('change', updateIsDesktop);
  }, []);

  const setOpen = useCallback<Dispatch<SetStateAction<boolean>>>(
    (value) => {
      if (isDesktop) {
        setDesktopOpen(value);
        return;
      }

      setMobileState((current) => {
        const currentOpen = current.open && current.pathname === location.pathname;
        const nextOpen = typeof value === 'function' ? value(currentOpen) : value;

        return {
          open: nextOpen,
          pathname: location.pathname,
        };
      });
    },
    [isDesktop, location.pathname]
  );

  return [isDesktop ? desktopOpen : mobileOpen, setOpen] as const;
}
