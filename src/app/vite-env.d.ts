/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_MOCK_DATA_FILL?: string;
  // TEMP_RECURRING_BILLS_QA_CLOCK: remove with the temporary QA clock.
  readonly VITE_ENABLE_RECURRING_BILLS_QA_CLOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// src/vite-env.d.ts
declare const __APP_VERSION__: string;
