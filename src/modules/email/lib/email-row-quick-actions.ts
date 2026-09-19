/**
 * Width a mail row gives up to the hover quick actions (flag / archive /
 * delete).
 *
 * The cluster is positioned `absolute right-2.5 top-8`, so it sits *over* the
 * row's text rather than beside it. Nothing reflows to make room; the text has
 * to yield the width itself, and every line the cluster covers has to yield it
 * — which is the bit that was missed. The subject reserved the space and the
 * preview underneath it did not, so on hover the preview ran on under three
 * floating icons with no fill of their own to hide it (elli-ui#995).
 *
 * Kept here, as one string applied to both lines, so the two cannot drift apart
 * again.
 */

/**
 * The cluster is three `size-7` (28px) buttons with `gap-0.5` plus a `right-2.5`
 * offset — about 92px. `pe-24` is 96px: the next step up on the spacing scale,
 * which covers it without arbitrary pixel values.
 */
const RESERVE = 'pe-24';

/**
 * Below `lg` the actions do not wait for a hover — they are painted at
 * `opacity-100` permanently, because a touch device has no hover to reveal
 * them. So the space has to be reserved permanently too.
 *
 * At `lg` and up they are revealed by hover or focus, and the reservation
 * follows them, so a resting row spends none of its width on controls that are
 * not showing.
 *
 * `max-lg:` and `lg:` are mutually exclusive media queries, so neither has to
 * override the other and the result does not depend on the order Tailwind
 * happens to emit the two variants in.
 */
export const EMAIL_ROW_QUICK_ACTION_RESERVE = [
  `max-lg:${RESERVE}`,
  `lg:group-hover:${RESERVE}`,
  `lg:group-focus-within:${RESERVE}`,
].join(' ');

/**
 * The reservation for a row, or `false` when the row renders no quick actions
 * and there is nothing to make room for.
 */
export function emailRowQuickActionReserve(hasQuickActions: boolean): string | false {
  return hasQuickActions && EMAIL_ROW_QUICK_ACTION_RESERVE;
}
