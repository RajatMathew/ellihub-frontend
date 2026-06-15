import { LoadingBarContainer } from 'react-top-loading-bar';

import { Toaster } from '@app/components/ui/sonner';

import '@app/styles/globals.css';

import { lazy, Suspense, useEffect, useState } from 'react';

import { AppLayout } from './components/layouts';
import { AppLoadingScreen } from './components/loader/app';
import { AccessProvider } from './contexts/access';
import DelayForDemo from './lib/delay';
import { BreadcrumbLabelsProvider } from './providers/breadcrumbs';
import { QueryProvider } from './providers/query';

const isDev = import.meta.env.DEV;

const AppRouting = lazy(() => DelayForDemo(import('./routing'), isDev ? 0 : 2000));

const ReactQueryDevtoolsProduction = lazy(() =>
  import('@tanstack/react-query-devtools/build/modern/production.js').then((d) => ({
    default: d.ReactQueryDevtools,
  }))
);

export function App() {
  const [showDevtools, setShowDevtools] = useState(false);
  useEffect(() => {
    window.toggleDevtools = () => setShowDevtools((old) => !old);
  }, []);
  return (
    <QueryProvider>
      <AccessProvider>
        <BreadcrumbLabelsProvider>
          <LoadingBarContainer>
            <Suspense fallback={<AppLoadingScreen />}>
              <AppLayout>
                <AppRouting />
              </AppLayout>
            </Suspense>
            <Toaster position="top-center" />
          </LoadingBarContainer>
        </BreadcrumbLabelsProvider>
      </AccessProvider>
      {showDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtoolsProduction initialIsOpen={true} />
        </Suspense>
      )}
    </QueryProvider>
  );
}
