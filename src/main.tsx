import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './main.css';

import FrameWork from '.';

// Check for SW updates every 15 minutes
registerSW({
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        15 * 60 * 1000
      );
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FrameWork />
  </StrictMode>
);
