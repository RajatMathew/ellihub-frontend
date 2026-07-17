import { SentEmailLog, type Prisma } from '@db/client';
import { prisma } from '@lib/prisma';
import {
    ActivityLogService,
    type ActivityAction,
    type ActivityEntityType,
} from '@modules/activity-log';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { BadRequestError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';

import {
    getMailService,
    MailProviderError,
    type MailAttachment,
    type MailSendResult,
    type SendMailInput,
} from './mail-service';

type LoggedMailActivityContext =
    | false
    | {
          entityType: ActivityEntityType;
          entityId: string;
          action?: ActivityAction;
          description: string;
          affectedEntityIds?: string[];
      };

export type LoggedMailContext = {
    feature?: string;
    entityType?: string;
    entityId?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    createdBy?: string;
    metadata?: Prisma.InputJsonValue;
    activity?: LoggedMailActivityContext;
};
export type LatestSentEmailLogQuery = {
    entityType: string;
    entityId: string;
    feature?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
};

export async function findLatestSentEmailLog(query: LatestSentEmailLogQuery) {
    return prisma.sentEmailLog.findFirst({
        where: {
            entityType: query.entityType,
            entityId: query.entityId,
            feature: query.feature,
            relatedEntityType: query.relatedEntityType,
            relatedEntityId: query.relatedEntityId,
            status: 'SENT',
        },
        orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
        select: {
            id: true,
            from: true,
            to: true,
            cc: true,
            bcc: true,
            subject: true,
            status: true,
            sentAt: true,
            createdAt: true,
        },
    });
}

type SerializedMailAttachment = {
    name: string;
    contentType: string;
    isInline: boolean;
    contentId: string | null;
    sizeBytes: number | null;
};

export async function sendLoggedMail(
    input: SendMailInput,
    context: LoggedMailContext = {}
): Promise<SentEmailLog> {
    let result: MailSendResult;

    try {
        result = await getMailService().sendMail(input);
    } catch (error) {
        const providerResult = error instanceof MailProviderError ? error.result : undefined;

        await logFailedMailAttempt(input, context, error, providerResult);

        throw createMailSendBadRequestError(error, input);
    }

    const sentAt = new Date();
    const log = await createSentEmailLog(input, context, {
        status: 'SENT',
        sentAt,
        providerResult: result,
    });

    if (context.activity && context.createdBy) {
        await ActivityLogService.log({
            userId: context.createdBy,
            entityType: context.activity.entityType,
            entityId: context.activity.entityId,
            action: context.activity.action ?? 'comment',
            description: context.activity.description,
            affectedEntityIds: context.activity.affectedEntityIds,
        });
    }

    return log;
}

export async function logFailedMailAttempt(
    input: SendMailInput,
    context: LoggedMailContext = {},
    error: unknown,
    providerResult?: MailSendResult
): Promise<SentEmailLog | null> {
    try {
        return await createSentEmailLog(input, context, {
            status: 'FAILED',
            sentAt: new Date(),
            providerResult,
            error: getErrorMessage(error),
        });
    } catch (logError) {
        console.error('Failed to create sent email failure log', logError);
        return null;
    }
}

async function createSentEmailLog(
    input: SendMailInput,
    context: LoggedMailContext,
    result: {
        status: 'SENT' | 'FAILED';
        sentAt?: Date;
        providerResult?: MailSendResult;
        error?: string;
    }
): Promise<SentEmailLog> {
    const data = {
        id: generateNanoId(),
        feature: context.feature,
        entityType: context.entityType,
        entityId: context.entityId,
        relatedEntityType: context.relatedEntityType,
        relatedEntityId: context.relatedEntityId,
        provider: result.providerResult?.provider ?? 'microsoftGraph',
        from: input.from,
        to: input.to,
        cc: input.cc ?? [],
        bcc: input.bcc ?? [],
        subject: input.subject,
        bodyHtml: input.html,
        status: result.status,
        providerStatus: result.providerResult?.status,
        providerResponse: toJsonValue(result.providerResult?.response),
        error: result.error,
        attachments: serializeAttachments(input.attachments ?? []),
        metadata: context.metadata,
        sentAt: result.sentAt,
        createdBy: context.createdBy,
    };

    try {
        return await prisma.sentEmailLog.create({ data });
    } catch (error) {
        if (context.createdBy && isForeignKeyConstraintError(error)) {
            return prisma.sentEmailLog.create({
                data: {
                    ...data,
                    createdBy: undefined,
                },
            });
        }

        throw error;
    }
}

function serializeAttachments(attachments: MailAttachment[]): SerializedMailAttachment[] {
    return attachments.map((attachment) => ({
        name: attachment.name,
        contentType: attachment.contentType || 'application/octet-stream',
        isInline: attachment.isInline ?? false,
        contentId: attachment.contentId ?? null,
        sizeBytes: getBase64Size(attachment.contentBytes),
    }));
}

function getBase64Size(value: string): number | null {
    const normalized = value.trim();
    if (!normalized) return null;

    const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
    return Math.floor((normalized.length * 3) / 4) - padding;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Mail send failed';
}

function createMailSendBadRequestError(error: unknown, input: SendMailInput): BadRequestError {
    if (error instanceof MailProviderError) {
        const graphError = parseGraphError(error.result.response.body);

        if (graphError?.code === 'ErrorInvalidUser') {
            return new BadRequestError(
                `Email could not be sent because the selected sender mailbox (${input.from}) is not valid in Microsoft 365. Choose another configured sender or update the sender configuration.`
            );
        }

        const message = graphError?.message || error.result.statusText || error.message;

        return new BadRequestError(
            `Microsoft Graph could not send the email (${error.result.status}${
                graphError?.code ? ` ${graphError.code}` : ''
            }): ${message}`
        );
    }

    return new BadRequestError(`Email could not be sent: ${getErrorMessage(error)}`);
}

function parseGraphError(body: string | null): { code?: string; message?: string } | null {
    if (!body) return null;

    try {
        const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } };
        return parsed.error ?? null;
    } catch {
        return null;
    }
}

function isForeignKeyConstraintError(error: unknown): boolean {
    return error instanceof PrismaClientKnownRequestError && error.code === 'P2003';
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
