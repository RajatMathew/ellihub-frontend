/**
 * The height the app shell leaves a page that fills its content area.
 *
 * The editor is a workspace, not a document: the canvas scrolls inside it and
 * the panels stay put, so the outer element has to be exactly as tall as the
 * space the shell gives it -- `h-dvh` would push the toolbar off the bottom by
 * the height of the header, and `min-h-*` would let the page grow and give the
 * window a second scrollbar.
 *
 * The two expressions are the shell's own: the header is `--header-height-mobile`
 * tall until `lg`, where it becomes `--header-height` and the content area also
 * gains `--page-margin` above and below. Both are set as inline custom
 * properties by `src/app/components/layouts`, which is why they are read rather
 * than restated. The mailbox and the email empty state size themselves with the
 * same pair.
 */
export const WORKSPACE_HEIGHT =
  'h-[calc(100dvh-var(--header-height-mobile))] lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]';
