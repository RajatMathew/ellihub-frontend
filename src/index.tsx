import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';

import { NotFound } from '@app/components/error/not-found';
import ProtectedLayout from '@app/components/layouts/protected';
import { BrandedLayout } from '@core/auth/layouts/branded';
import SignOutPage from '@core/auth/pages/sign-out';
import { SignInPage } from '@core/auth/pages/signin-page';
import HelpApp from '@core/help';
import { CompanyLandingPage } from '@/modules/public/pages/company-landing-page';
import { App } from './app';
import { PrivacyPolicyPage, EndUserLicenseAgreementPage } from './modules/public/pages/legal-pages';



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
            <Route path="/" element={<CompanyLandingPage />} />
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
            <Route
              path="end-user-license-agreement"
              element={<EndUserLicenseAgreementPage />}
            />
            <Route
              path="eula"
              element={<Navigate to="/end-user-license-agreement" replace />}
            />
            <Route element={<ProtectedLayout />}>
              <Route path="app/*" element={<App />} />
              <Route path="profile" element={<Navigate to="/app/profile" replace />} />
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </ThemeProvider>
  );
}

export default FrameWork;
