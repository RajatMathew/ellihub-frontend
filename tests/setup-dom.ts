/**
 * Bun has no DOM, and the email body pipeline is DOM-shaped end to end
 * (`DOMParser`, `TreeWalker`, `compareDocumentPosition`). Registering happy-dom
 * globally lets those modules be unit tested here instead of only through a
 * browser run. Loaded via `bunfig.toml`'s test preload.
 *
 * NOT valid for testing sanitization. DOMPurify requires a real browser DOM;
 * under happy-dom it silently under-sanitizes (a `<script>` tag survives), so a
 * passing test here would be worse than no test. Sanitizer behaviour is covered
 * by the Playwright suite instead.
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator';

if (typeof globalThis.document === 'undefined') {
  GlobalRegistrator.register({
    settings: {
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      disableComputedStyleRendering: true,
    },
  });
}
