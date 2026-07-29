export * from './email.hooks';
export * from './use-bounded-email-sync-indicator';

// Keep newly added draft hooks as explicit barrel exports. Vite's dev-module graph can retain the
// previous `export *` shape during HMR, which makes a newly introduced named export unavailable
// until a full restart.
export {
  useDeleteEmailDraftMutation,
  useOpenEmailDraftMutation,
  useSaveEmailDraftMutation,
  useSendEmailDraftMutation,
} from './email.hooks';
