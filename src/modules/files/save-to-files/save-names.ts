/**
 * The display name each file in a save is written under (elli-ui#1063).
 *
 * A selection of attachments could not be renamed on the way in — there was
 * one name field and it belonged to the single-file case — so filing five
 * attachments meant saving `image003.png` and four of its friends and then
 * renaming all five in Files afterwards.
 *
 * Positional, and forgiving in both directions: a caller that offers no rename
 * passes `[]` and every file keeps the name it arrived with, and a name that
 * has been emptied falls back the same way rather than saving a file called
 * nothing. The dialog blocks an empty name before it reaches here; this is the
 * guarantee for every other caller.
 *
 * Deliberately takes the defaults rather than the sources: it keeps this
 * module free of the axios client `save-source` pulls in, which is what lets
 * the rule be tested without standing up the app.
 */
export function resolveSaveNames(
  defaults: readonly string[],
  names: readonly string[] = []
): string[] {
  return defaults.map((fallback, index) => names[index]?.trim() || fallback);
}
