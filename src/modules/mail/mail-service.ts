import { getMailConfig } from './config';
import { createGraphClient, type GraphFetch } from './graph-client';

export type MailAttachment = {
    name: string;
    contentType: string;
    contentBytes: string;
    isInline?: boolean;
    contentId?: string;
};

export type SendMailInput = {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    attachments?: MailAttachment[];
    saveToSentItems?: boolean;
};

export function createMailService(graphFetch: GraphFetch) {
    async function sendMail(input: SendMailInput): Promise<void> {
        const response = await graphFetch(`/users/${encodeURIComponent(input.from)}/sendMail`, {
            method: 'POST',
            body: JSON.stringify({
                message: {
                    subject: input.subject,
                    body: {
                        contentType: 'HTML',
                        content: input.html,
                    },
                    toRecipients: toGraphRecipients(input.to),
                    ccRecipients: toGraphRecipients(input.cc ?? []),
                    bccRecipients: toGraphRecipients(input.bcc ?? []),
                    attachments: toGraphAttachments(input.attachments ?? []),
                },
                saveToSentItems: input.saveToSentItems ?? true,
            }),
        });

        if (response.status !== 202) {
            throw new Error(
                `Microsoft Graph sendMail failed (${response.status}): ${await response.text()}`
            );
        }
    }

    return { sendMail };
}

export function getMailService() {
    const graphClient = createGraphClient(getMailConfig());
    return createMailService(graphClient.graphFetch);
}

function toGraphRecipients(addresses: string[]) {
    return addresses.map((address) => ({
        emailAddress: { address },
    }));
}

function toGraphAttachments(attachments: MailAttachment[]) {
    return attachments.map((attachment) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.name,
        contentType: attachment.contentType || 'application/octet-stream',
        contentBytes: attachment.contentBytes,
        isInline: attachment.isInline ?? false,
        ...(attachment.contentId ? { contentId: attachment.contentId } : {}),
    }));
}
