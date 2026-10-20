/**
 * Which mailbox a calendar option belongs to, and what to call it.
 *
 * The calendar picker lists more than one mailbox at once: the mailbox being
 * viewed, plus every shared mailbox in the organization, so one view can mirror
 * Outlook's "People's calendars". `elli-core` names every default calendar in
 * that list after its mailbox — `Procurement`, `Elli-Contracts` — and every
 * other calendar `<mailbox> – <calendar>`, since the provider calls each
 * default calendar just "Calendar". It used to call the viewing mailbox's own
 * default "My calendar" instead, which said nothing about whose it was — and on
 * a shared mailbox the reader does not think of as theirs, "my" was simply
 * wrong (elli-ui#1241, elli-ui#1395).
 *
 * The viewing mailbox's default calendar still gets its address beside it, so
 * the owner is unmistakable even when its display name is something short.
 *
 * Scoped to the primary deliberately. `elli-core` forces `primary: false` on
 * every option it borrows from another mailbox, so `isPrimary` is exactly "the
 * viewing mailbox's own default calendar". The mailbox's other calendars keep
 * their real Outlook names, and repeating the address on each of them would be
 * noise.
 */

type CalendarOption = {
  /** True only for the viewing mailbox's own default calendar. */
  isPrimary?: boolean | null;
  /** The calendar's name, as the API returns it. */
  name?: string | null;
};

/**
 * The mailbox address to show beside a calendar option, or `null` when the
 * option's own name already identifies it.
 *
 * `mailboxAddress` is the account's `mailboxAddress` — the shared address for a
 * shared mailbox, the user's own for a personal one. It is absent while the
 * accounts query is still loading, which is why this answers `null` rather than
 * rendering an empty pair of brackets. A mailbox with no display name has its
 * default calendar named by the address itself, and saying it twice is noise.
 */
export function calendarOwnerAddress(
  calendar: CalendarOption,
  mailboxAddress: string | null | undefined
): string | null {
  if (!calendar.isPrimary) return null;
  const address = mailboxAddress?.trim();
  if (!address) return null;
  if (calendar.name?.trim().toLowerCase() === address.toLowerCase()) return null;
  return address;
}

/**
 * The option as one string: `Procurement (procurement@ellicorp.com)`.
 *
 * What a screen reader hears, and what a `title` shows on hover — the rendered
 * label splits the two parts across spans so neither truncates the other, and
 * in the narrow toolbar menu puts them on separate lines.
 */
export function calendarOptionLabel(name: string, ownerAddress: string | null): string {
  return ownerAddress ? `${name} (${ownerAddress})` : name;
}

/**
 * The calendar an event dialog shows when no subscribed calendar matches —
 * the mailbox has none writable yet, or the event sits in one not subscribed.
 * The event then lands in, or already lives in, a calendar we cannot name for
 * certain, so it says "Calendar" (the provider's own name for a default
 * calendar) rather than a pronoun.
 */
export function eventCalendarName(active: { name: string } | null | undefined): string {
  return active?.name || 'Calendar';
}
