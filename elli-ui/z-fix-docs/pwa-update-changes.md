# PWA Auto-Update Changes

## Problem

The PWA was not updating for users even after new builds were deployed. The default `vite-plugin-pwa` setup only registered the service worker once on page load and never checked for updates. Since this is an SPA, users rarely do full page reloads, so they stay on stale cached assets indefinitely.

## Changes Made

### 1. `vite.config.ts`

Added `injectRegister: false` to the `VitePWA` plugin config.

```ts
// Before
VitePWA({
  registerType: 'autoUpdate',
  devOptions: { enabled: false },
  // ...
})

// After
VitePWA({
  registerType: 'autoUpdate',
  injectRegister: false,   // <-- added
  devOptions: { enabled: false },
  // ...
})
```

**Why:** Prevents the plugin from injecting the default `registerSW.js` script tag into `index.html`. We handle registration manually instead.

### 2. `src/main.tsx`

Added manual SW registration with a periodic update check.

```ts
import { registerSW } from 'virtual:pwa-register';

registerSW({
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 15 * 60 * 1000); // every 15 minutes
    }
  },
});
```

**Why:** Calls `registration.update()` every 15 minutes so the browser checks for a new service worker even if the user never reloads the page.

### 3. `tsconfig.app.json`

Added `vite-plugin-pwa/client` to the `types` array.

```json
// Before
"types": ["vite/client"]

// After
"types": ["vite/client", "vite-plugin-pwa/client"]
```

**Why:** Provides TypeScript type definitions for the `virtual:pwa-register` module.

## How to Revert

To go back to the default (non-updating) behavior:

1. **`vite.config.ts`** — remove the `injectRegister: false` line
2. **`src/main.tsx`** — remove the `registerSW` import and the `registerSW({...})` block
3. **`tsconfig.app.json`** — remove `"vite-plugin-pwa/client"` from the `types` array

## Reference

- Plugin docs: https://vite-pwa-org.netlify.app/
- Auto-update guide: https://vite-pwa-org.netlify.app/guide/auto-update.html
- Periodic SW updates: https://vite-pwa-org.netlify.app/guide/periodic-sw-updates.html
