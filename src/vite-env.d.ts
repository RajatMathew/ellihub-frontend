/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_ENABLE_MOCK_DATA_FILL?: string;
  // TEMP_RECURRING_BILLS_QA_CLOCK: remove with the temporary QA clock.
  readonly VITE_ENABLE_RECURRING_BILLS_QA_CLOCK?: string;
}

interface Window {
  toggleDevtools: () => void;
}
