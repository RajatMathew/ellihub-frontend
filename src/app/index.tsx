import { LoadingBarContainer } from 'react-top-loading-bar';

import { Toaster } from '@app/components/ui/sonner';
import { AppRouting } from '@app/routing';

import '@app/styles/globals.css';

import { AppLayout } from './components/layouts';
import { QueryProvider } from './providers/query';

export function App() {
  return (
    <QueryProvider>
      <LoadingBarContainer>
        <AppLayout>
          <AppRouting />
        </AppLayout>
        <Toaster />
      </LoadingBarContainer>
    </QueryProvider>
  );
}
