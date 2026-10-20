import api from '@/app/api';

import { emailActionHeaders } from './email-action-source';

/**
 * Puts the open thread and any Elliot proposal being approved on the app's
 * writes (see `email-action-source.ts`). Kept apart from the state so that can
 * be tested without the API client.
 */
let installed = false;

/** Adds the headers to the app's API client. Idempotent. */
export function installEmailActionSourceHeaders(): void {
  if (installed) return;
  installed = true;
  api.interceptors.request.use((config) => {
    for (const [name, value] of Object.entries(emailActionHeaders(config.method))) {
      config.headers.set(name, value);
    }
    return config;
  });
}
