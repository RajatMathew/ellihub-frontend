import { LoadingBarContainer } from 'react-top-loading-bar';

import { Toaster } from '@app/components/ui/sonner';

import '@app/styles/globals.css';

import { lazy, Suspense } from 'react';

import { AppLayout } from './components/layouts';
import { AppLoadingScreen } from './components/loader/app';
import DelayForDemo from './lib/delay';
import { QueryProvider } from './providers/query';

const AppRouting = lazy(() => DelayForDemo(import('./routing'), 5000));

export function App() {
  return (
    <QueryProvider>
      <LoadingBarContainer>
        <Suspense fallback={<AppLoadingScreen />}>
          <AppLayout>
            <AppRouting />
          </AppLayout>
        </Suspense>
        <Toaster />
      </LoadingBarContainer>
    </QueryProvider>
  );
}
