/**
 * How wide Elliot's panel is and what it does to the mailbox beside it.
 *
 * On a wide screen the panel can grow into a workspace that pushes the mailbox
 * aside, then hides the email list. On a phone (below the app's `lg` layout)
 * there is no "aside": the panel already covers the screen. Growing it there
 * set 640px on a ~390px screen and padded the mailbox by the same, so the
 * panel ran off the left edge and the chat was cut off (elli-ui#1056).
 */
export const PUSH_CONTENT_WIDTH = 520;
export const HIDE_EMAIL_LIST_WIDTH = 640;

export function agentPanelLayout(input: { open: boolean; width: number; isMobile: boolean }): {
  pushesContent: boolean;
  hidesEmailList: boolean;
  /** Whether the workspace toggle and the resize handle are offered at all. */
  canResize: boolean;
  /** The panel's CSS width: what was chosen, but never wider than the screen. */
  cssWidth: string;
} {
  const { open, width, isMobile } = input;
  const roomy = open && !isMobile;
  return {
    pushesContent: roomy && width >= PUSH_CONTENT_WIDTH,
    hidesEmailList: roomy && width >= HIDE_EMAIL_LIST_WIDTH,
    canResize: !isMobile,
    cssWidth: `min(${width}px, 100%)`,
  };
}

/**
 * The three sizes the header's one size button offers (elli-ui#1370): a small
 * panel over the mailbox, half the window beside it, or the whole window.
 */
export type AgentPanelSize = 'small' | 'half' | 'full';

/**
 * Which size the panel is at now. Dragging the edge can land anywhere, so
 * "half" is any width that pushes the mailbox aside — the menu's check mark
 * then still says which of the three the panel is closest to behaving like.
 */
export function agentPanelSize(input: { fullscreen: boolean; width: number }): AgentPanelSize {
  if (input.fullscreen) return 'full';
  return input.width >= PUSH_CONTENT_WIDTH ? 'half' : 'small';
}

/**
 * The panel's width at "half": half of the space it opens in, but never so
 * narrow that it would stop pushing the mailbox aside and float over it.
 */
export function halfPanelWidth(containerWidth: number): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return HIDE_EMAIL_LIST_WIDTH;
  return Math.max(PUSH_CONTENT_WIDTH, Math.round(containerWidth / 2));
}
