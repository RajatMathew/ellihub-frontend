export type EmailTagDelta = {
  addNames?: string[];
  removeNames?: string[];
};

/**
 * One message's Elli tags after a toggle, matched case-insensitively and
 * sorted — what the optimistic pass writes before the server answers.
 */
export function applyEmailTagDelta(tags: string[] | undefined, delta: EmailTagDelta): string[] {
  const remove = new Set((delta.removeNames ?? []).map((name) => name.toLowerCase()));
  const next = new Map((tags ?? []).map((name) => [name.toLowerCase(), name]));
  remove.forEach((name) => next.delete(name));
  (delta.addNames ?? []).forEach((name) => {
    if (!remove.has(name.toLowerCase())) next.set(name.toLowerCase(), name);
  });
  return Array.from(next.values()).sort();
}

/**
 * The edit that undoes `delta`. A failed edit reverts by applying this rather
 * than restoring the cache it saw: tag edits queue behind one another, so that
 * cache predates every click after it, and restoring it would clear them too.
 */
export function invertEmailTagDelta(delta: EmailTagDelta): EmailTagDelta {
  return { addNames: delta.removeNames, removeNames: delta.addNames };
}
