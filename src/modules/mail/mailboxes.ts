import { allowsCustomSender, getMailSenderOptions } from './config';

export function getSenderMailboxes(): string[] {
    return getMailSenderOptions();
}

export function isAllowedSender(mailbox: string): boolean {
    if (allowsCustomSender()) return true;
    return getSenderMailboxes().includes(mailbox.toLowerCase());
}
