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

export type MailSendResult = {
    provider: 'microsoftGraph';
    status: number;
    statusText: string;
    response: {
        requestId: string | null;
        clientRequestId: string | null;
        body: string | null;
    };
};

export class MailProviderError extends Error {
    constructor(
        message: string,
        readonly result: MailSendResult
    ) {
        super(message);
        this.name = 'MailProviderError';
    }
}

export function createMailService(graphFetch: GraphFetch) {
    async function sendMail(input: SendMailInput): Promise<MailSendResult> {
        if (isEmailSendingDisallowed()) {
            throw new MailProviderError('Email sending is disabled in Sandbox mode.', {
                provider: 'microsoftGraph',
                status: 403,
                statusText: 'Forbidden',
                response: {
                    requestId: null,
                    clientRequestId: null,
                    body: null,
                },
            });
        }

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
        const responseBody = await response.text();
        const result: MailSendResult = {
            provider: 'microsoftGraph',
            status: response.status,
            statusText: response.statusText,
            response: {
                requestId: response.headers.get('request-id'),
                clientRequestId: response.headers.get('client-request-id'),
                body: responseBody || null,
            },
        };

        if (response.status !== 202) {
            throw new MailProviderError(
                `Microsoft Graph sendMail failed (${response.status}): ${responseBody}`,
                result
            );
        }

        return result;
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

function isEmailSendingDisallowed(): boolean {
    return process.env.ALLOW_EMAIL_SENDING?.trim().toLowerCase() === 'false';
}
