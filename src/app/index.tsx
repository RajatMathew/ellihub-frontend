import { LoadingBarContainer } from 'react-top-loading-bar';

import { Toaster } from '@app/components/ui/sonner';

import '@app/styles/globals.css';

import { lazy, Suspense } from 'react';

import { AppLayout } from './components/layouts';
import { AppLoadingScreen } from './components/loader/app';
import DelayForDemo from './lib/delay';
import { QueryProvider } from './providers/query';

const isDev = import.meta.env.DEV;

const AppRouting = lazy(() => DelayForDemo(import('./routing'), isDev ? 0 : 2000));

export function App() {
  return (
    <QueryProvider>
      <LoadingBarContainer>
        <Suspense fallback={<AppLoadingScreen />}>
          <AppLayout>
            <AppRouting />
          </AppLayout>
        </Suspense>
        <Toaster position="top-center" />
      </LoadingBarContainer>
    </QueryProvider>
  );
}
