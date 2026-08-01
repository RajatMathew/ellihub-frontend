import { StrictMode } from 'react';

import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';

import './main.css';

import FrameWork from '.';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    dataCollection: {
      // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#dataCollection
      // userInfo: false,
      // httpBodies: [],
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FrameWork />
  </StrictMode>
);
