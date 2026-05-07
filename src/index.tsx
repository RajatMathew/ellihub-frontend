import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { NotFound } from '@app/components/error/not-found';
import ProtectedLayout from '@app/components/layouts/protected';
import { BrandedLayout } from '@core/auth/layouts/branded';
import SignOutPage from '@core/auth/pages/sign-out';
import { SignInPage } from '@core/auth/pages/signin-page';
import HelpApp from '@core/help';
import {
  QuickBooksConnectPage,
  QuickBooksDisconnectedPage,
} from '@modules/integrations/pages/quickbooks-public-pages';

import { App } from './app';

function RedirectToAppPath({ prefix }: { prefix: string }) {
  const location = useLocation();
  const path = location.pathname.replace(new RegExp(`^/${prefix}`), `/app/${prefix}`);

  return <Navigate to={`${path}${location.search}${location.hash}`} replace />;
}

function FrameWork() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="vite-theme"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <HelmetProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<ProtectedLayout />}>
              <Route path="app/*" element={<App />} />
              <Route path="profile" element={<Navigate to="/app/profile" replace />} />
              <Route path="integrations/*" element={<RedirectToAppPath prefix="integrations" />} />
              <Route path="help/*" element={<HelpApp />} />
              <Route
                path="/"
                element={
                  <div>
                    Home Page (to be implemented) <Link to="/app">Go to App</Link>
                  </div>
                }
              />
            </Route>

            <Route element={<BrandedLayout />}>
              <Route path="sign-in" element={<SignInPage />} />
              <Route path="sign-out" element={<SignOutPage />} />
              <Route path="quickbooks/connect" element={<QuickBooksConnectPage />} />
              <Route path="quickbooks/disconnected" element={<QuickBooksDisconnectedPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </ThemeProvider>
  );
}

export default FrameWork;
