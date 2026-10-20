/**
 * Whether the mailbox switcher offers "Manage accounts" (elli-ui#1082). The
 * sidebar's Email section has its own manage button, so the switcher repeats
 * it only while that is out of sight: the sidebar collapsed, or on a phone,
 * where it is tucked behind the menu button.
 */
export function switcherOffersManageAccounts(layout: {
  isMobile: boolean;
  isSidebarOpen: boolean;
}): boolean {
  return layout.isMobile || !layout.isSidebarOpen;
}
