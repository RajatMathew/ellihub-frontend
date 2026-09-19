/**
 * What the shared full-page editor is opened with when the surface is a reply
 * or a forward rather than a new message (elli-ui#1008). Reply and new mail
 * render the same editor, so the only thing that separates them is this seed.
 */

export type EmailComposerMode = 'reply' | 'forward';

export type ReplyComposeSeed = {
  title: string;
  /** Pre-filled recipient — a reply answers the sender, a forward has none yet. */
  to: string;
  /** Accessible name for the body field. */
  bodyLabel: string;
  bodyPlaceholder: string;
  /** Where the caret starts: a forward still needs a recipient. */
  preferBodyFocus: boolean;
};

export function getReplyComposeSeed(input: {
  mode: EmailComposerMode;
  senderEmail: string;
}): ReplyComposeSeed {
  const isForward = input.mode === 'forward';
  return {
    title: isForward ? 'Forward' : 'Reply',
    to: isForward ? '' : input.senderEmail,
    bodyLabel: isForward ? 'Forward message' : 'Reply message',
    bodyPlaceholder: isForward ? 'Add a message (optional)...' : 'Write your message...',
    preferBodyFocus: !isForward,
  };
}
