import { getMailSenderOptions } from './config';

export function getSenderMailboxes(): string[] {
    return getMailSenderOptions();
}

export function isAllowedSender(mailbox: string): boolean {
    return getSenderMailboxes().includes(mailbox.toLowerCase());
}
