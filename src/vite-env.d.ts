/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_ENABLE_MOCK_DATA_FILL?: string;
  readonly VITE_DISABLE_ELLIOT_AGENT?: string;
  /** `'true'` hides Elliot the classifier's readings in the mailbox (no `GET /elliot/readings`). */
  readonly VITE_DISABLE_ELLIOT_CLASSIFIER?: string;
  /** `'iframe'` keeps received-mail bodies in the sandboxed frame; anything else, or unset, uses the Macro renderer. */
  readonly VITE_EMAIL_RENDERER?: string;
  // TEMP_RECURRING_BILLS_QA_CLOCK: remove with the temporary QA clock.
  readonly VITE_ENABLE_RECURRING_BILLS_QA_CLOCK?: string;
  readonly VITE_SENTRY_DSN?: string;
  /**
   * The PDF editor's own API. Unset -- which is how it ships today -- means
   * the editor saves in the browser and does not offer bulk generation; see
   * `src/modules/pdf-editor/constants/pdf-editor.constants.ts`.
   */
  readonly VITE_PDF_API_URL?: string;
  /** Which `@pdf-slot/core` this build is pinned to, sent with every bulk job. */
  readonly VITE_PDF_CORE_VERSION?: string;
  /** A testing aid: re-render the PDF on every edit, not only on download. */
  readonly VITE_PDF_RENDER_ON_COMMIT?: string;
}

interface Window {
  toggleDevtools: () => void;
}
