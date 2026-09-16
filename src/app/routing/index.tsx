import { useEffect, useState } from 'react';

import { useLocation } from 'react-router-dom';
import { useLoadingBar } from 'react-top-loading-bar';

import { ErrorBoundary } from '@app/components/error/error-boundary';
import { HelpCenterRail } from '@core/help/components/help-center-panel';

import { AppRoutingSetup, HeaderRoutingSetup } from './setup';

export function AppRouting() {
  const { start, complete } = useLoadingBar({
    color: 'var(--color-primary)',
    shadow: false,
    waitingTime: 400,
    transitionTime: 200,
    height: 2,
  });

  const [firstLoad, setFirstLoad] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (firstLoad) {
      setFirstLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!firstLoad) {
      start('static');

      // Complete the loading bar after a short delay to simulate page load
      const timer = setTimeout(() => {
        complete();
      }, 100); // Short delay to show the loading animation

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <>
      <div className="flex h-dvh w-full grow flex-col overflow-hidden bg-background pt-(--header-height-mobile) lg:h-auto lg:border-e lg:border-b lg:border-border min-w-0 max-w-full lg:max-w-[calc(100vw-var(--sidebar-width))] lg:in-data-[sidebar-open=false]:max-w-[calc(100vw-var(--sidebar-collapsed-width))] lg:in-data-[sidebar-open=false]:border-s lg:mb-(--page-margin) lg:me-(--page-margin) lg:pt-0 lg:mt-[calc(var(--header-height)+var(--page-margin))] lg:ms-(--sidebar-width) lg:in-data-[sidebar-open=false]:ms-(--sidebar-collapsed-width) in-data-[chrome-hidden=true]:border-0 in-data-[chrome-hidden=true]:pt-0 transition-all duration-300">
        <main
          className="min-h-0 w-full grow min-w-0 max-w-full overflow-x-clip overflow-y-auto bg-background lg:h-auto lg:min-h-[calc(100vh-(var(--header-height)))] lg:max-h-[calc(100vh-(var(--header-height)))]"
          role="main"
        >
          <HeaderRoutingSetup />
          <ErrorBoundary>
            <AppRoutingSetup />
          </ErrorBoundary>
        </main>
      </div>
      <HelpCenterRail />
    </>
  );
}

export default AppRouting;
