import { PostHogProvider } from '@posthog/react';
import { ThemeProvider } from 'next-themes';
import posthog from 'posthog-js';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { NotFound } from '@app/components/error/not-found';
import { RootErrorBoundary } from '@app/components/error/root-error-boundary';
import ProtectedLayout from '@app/components/layouts/protected';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  THEME_SWITCHER_ENABLED,
  THEME_VALUES,
} from '@app/theme/theme-registry';
import { PostHogIdentity } from '@core/auth/components/posthog-identity';
import { BrandedLayout } from '@core/auth/layouts/branded';
import { redactMagicLinkTokensInEvent, watchForMagicLinkTokens } from '@core/auth/lib/magic-link';
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

const posthogProjectToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogEnabled = import.meta.env.VITE_ENABLE_POSTHOG === 'true';
const posthogAPI_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

// Before anything records the URL: a sign-in link's token leaves the address
// bar here and waits for the sign-in page (core/auth/lib/magic-link.ts).
watchForMagicLinkTokens();

if (posthogEnabled && posthogProjectToken) {
  posthog.init(posthogProjectToken, {
    api_host: posthogAPI_HOST,
    defaults: '2026-01-30',
    before_send: redactMagicLinkTokensInEvent,
  });
}

function FrameWork() {
  return (
    <PostHogProvider client={posthog}>
      <PostHogIdentity />
      <ThemeProvider
        attribute="class"
        defaultTheme={DEFAULT_THEME}
        forcedTheme={THEME_SWITCHER_ENABLED ? undefined : DEFAULT_THEME}
        storageKey={THEME_STORAGE_KEY}
        enableSystem={false}
        disableTransitionOnChange
        enableColorScheme
        themes={THEME_SWITCHER_ENABLED ? [...THEME_VALUES] : [DEFAULT_THEME]}
      >
        <PwaUpdateModal />
        <HelmetProvider>
          <BrowserRouter>
            {/*
              The outer net. The boundary inside the app shell keeps the chrome
              usable when only a page throws; this one is what stands between a
              crash in ProtectedLayout, AppLayout, the sidebar, sign-in or a
              public page and a blank white screen. Inside BrowserRouter
              because its fallback navigates.
            */}
            <RootErrorBoundary>
              <Routes>
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
                  <Route path="/" element={<Navigate to="/app/projects" replace />} />
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
            </RootErrorBoundary>
          </BrowserRouter>
        </HelmetProvider>
      </ThemeProvider>
    </PostHogProvider>
  );
}

export default FrameWork;
