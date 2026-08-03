import { LoadingBarContainer } from 'react-top-loading-bar';

import { Toaster } from '@app/components/ui/sonner';

import '@app/styles/globals.css';

import { lazy, Suspense, useEffect, useState } from 'react';

import { UploadManagerProvider } from '@/modules/files/uploads/upload-manager';
import { UploadTransferTray } from '@/modules/files/uploads/upload-transfer-tray';

import { AppLayout } from './components/layouts';
import { AppLoadingScreen } from './components/loader/app';
import { AccessProvider } from './contexts/access';
import { BreadcrumbLabelsProvider } from './providers/breadcrumbs';
import { QueryProvider } from './providers/query';

const AppRouting = lazy(() => import('./routing'));

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
      <UploadManagerProvider>
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
        <UploadTransferTray />
      </UploadManagerProvider>
      {showDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtoolsProduction initialIsOpen={true} />
        </Suspense>
      )}
    </QueryProvider>
  );
}
