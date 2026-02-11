import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';

import { NotFound } from '@app/components/error/not-found';
import ProtectedLayout from '@app/components/layouts/protected';
import { BrandedLayout } from '@core/auth/layouts/branded';
import { SignInPage } from '@core/auth/pages/signin-page';
import HelpApp from '@core/help';

import { App } from './app';

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
              <Route path="login" element={<SignInPage />} />
              <Route
                path="sign-out"
                element={
                  <div>
                    Sign Out Page (to be implemented) <Link to="/app">Go to App</Link>
                  </div>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </ThemeProvider>
  );
}

export default FrameWork;
