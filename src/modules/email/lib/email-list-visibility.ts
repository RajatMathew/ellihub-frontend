/**
 * Whether the mailbox's email list column is open, after Elliot's panel
 * reports a new layout.
 *
 * The list can be closed two ways: by the reader, with the collapse button in
 * the list's header, or by Elliot growing wide enough to need the room. Only a
 * change in what Elliot needs moves it. The panel reports its layout on every
 * width change, so answering "hidden" for every report while it is wide would
 * close the list again the moment the reader dragged the panel after reopening
 * it (elli-ui#1409); answering "shown" for every report while it is small would
 * reopen a list the reader closed on purpose.
 */
export function nextEmailListVisible(input: {
  /** Whether the list is open now. */
  visible: boolean;
  /** Whether the panel's previous layout hid the list. */
  agentHidList: boolean;
  /** Whether the panel's new layout hides the list. */
  agentHidesList: boolean;
}): boolean {
  const { visible, agentHidList, agentHidesList } = input;
  // Elliot just grew past the width where the list fits beside it.
  if (agentHidesList && !agentHidList) return false;
  // Elliot shrank or closed: give back the room it took.
  if (!agentHidesList && agentHidList) return true;
  return visible;
}

/**
 * Whether the list column renders. Below `lg` the list and the reading pane
 * share one screen and swap, and there is no button there to reopen a closed
 * column, so a column closed on a wide window comes back on a narrow one.
 */
export function isEmailListShown(input: { visible: boolean; isMobile: boolean }): boolean {
  return input.visible || input.isMobile;
}
