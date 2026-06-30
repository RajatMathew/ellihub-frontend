import { CompanyLandingPage } from '@/modules/public/pages/company-landing-page';
import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { NotFound } from '@app/components/error/not-found';
import ProtectedLayout from '@app/components/layouts/protected';
import { BrandedLayout } from '@core/auth/layouts/branded';
import { ForgotPasswordPage } from '@core/auth/pages/forgot-password-page';
import { ResetPasswordPage } from '@core/auth/pages/reset-password-page';
import SignOutPage from '@core/auth/pages/sign-out';
import { SignInPage } from '@core/auth/pages/signin-page';
import HelpApp from '@core/help';

import { App } from './app';
import { PwaUpdateModal } from './core/pwa/PwaUpdateModal';
import {
  QuickBooksConnectPage,
  QuickBooksDisconnectedPage,
} from './modules/integrations/pages/quickbooks-public-pages';
import { EndUserLicenseAgreementPage, PrivacyPolicyPage } from './modules/public/pages/legal-pages';

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
      <PwaUpdateModal />
      <HelmetProvider>
        <BrowserRouter>
          <Routes>
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="end-user-license-agreement" element={<EndUserLicenseAgreementPage />} />
            <Route path="eula" element={<Navigate to="/end-user-license-agreement" replace />} />
            <Route element={<ProtectedLayout />}>
              <Route path="app/*" element={<App />} />
              <Route path="profile" element={<Navigate to="/app/profile" replace />} />
              <Route path="help/*" element={<HelpApp />} />
              <Route path="/" element={<CompanyLandingPage />} />
            </Route>
            <Route element={<BrandedLayout />}>
              <Route path="sign-in" element={<SignInPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
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
