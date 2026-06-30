export const PWA_UPDATE_AVAILABLE_EVENT = 'pwa-update-available';

export function openPwaUpdateModal() {
  window.dispatchEvent(new CustomEvent(PWA_UPDATE_AVAILABLE_EVENT));
}
