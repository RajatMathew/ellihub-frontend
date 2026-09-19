/**
 * The mail workspace region the full-page editor fills.
 *
 * The new-message editor is mounted there by the mailbox page; a reply is
 * mounted inside the thread's scroll container and portals into the same layer
 * when it goes full page, so both editors sit in the same slot and neither
 * scrolls with the conversation behind it (elli-ui#1008, elli-ui#1009).
 */
export const COMPOSE_LAYER_ATTRIBUTE = 'data-mail-compose-layer';

export const COMPOSE_LAYER_SELECTOR = `[${COMPOSE_LAYER_ATTRIBUTE}]`;
