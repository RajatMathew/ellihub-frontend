import {
    EmailAccountStatus,
    EmailFolderWellKnown,
    EmailServiceType,
    EmailSyncStatus,
    Prisma,
    type EmailAccount,
    type EmailMessageCache,
    type EmailSyncState,
} from '@db/client';
import { prisma } from '@lib/prisma';
import { BadRequestError, ExternalServiceError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { addMinutes } from 'date-fns';

import {
    AurinkoClient,
    type AurinkoEmailAddress,
    type AurinkoFolder,
    type AurinkoGmailLabel,
    type AurinkoGraphCategory,
    type AurinkoMessage,
    type AurinkoServiceType,
} from './aurinko-client';
import { decryptAurinkoToken, encryptAurinkoToken } from './crypto';
import { toEmailFreshness } from './sync-health';

import type {
    AuthCallbackQuery,
    AuthStartQuery,
    MessageListQuery,
    MoveMessageInput,
    ReplyMessageInput,
    SendMessageInput,
    UpdateMessageStatusInput,
    CreateFolderInput,
    CreateTagInput,
    UpdateMessageTagsInput,
} from './models';

const DEFAULT_ORGANIZATION_SLUG = 'default';
const DEFAULT_SYNC_DAYS = 30;
const SYNC_PAGE_BUDGET = 2;
const EMAIL_FOLDER_REFRESH_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_PROVIDER_COOLDOWN_MS = 30 * 1000;
const FRONTEND_FALLBACK_URL = 'http://localhost:5173/app/email/procurement';
const WELL_KNOWN_FOLDER_LABELS: Record<EmailFolderWellKnown, string> = {
    [EmailFolderWellKnown.INBOX]: 'Inbox',
    [EmailFolderWellKnown.DRAFTS]: 'Drafts',
    [EmailFolderWellKnown.SENT]: 'Sent Items',
    [EmailFolderWellKnown.DELETED]: 'Deleted Items',
    [EmailFolderWellKnown.JUNK]: 'Junk Email',
    [EmailFolderWellKnown.ARCHIVE]: 'Archive',
};

type RequestContext = {
    userId: string;
    organizationId: string;
};

type CachedMessageWithRelations = EmailMessageCache & {
    attachments: Array<{
        id: string;
        providerId: string;
        name: string;
        mimeType: string | null;
        size: number | null;
    }>;
    folder: {
        wellKnownKey: EmailFolderWellKnown | null;
    } | null;
};

type EmailTagDto = {
    id: string;
    providerId: string;
    name: string;
    color: string | null;
    source: 'provider' | 'cache';
};

type CachedEmailAddress = {
    name?: string | null;
    address?: string | null;
    raw?: string | null;
};

type SyncStepResult = {
    synced: boolean;
    status: 'ready' | 'partial';
    processed: number;
    hasMore: boolean;
    lastSyncedAt: string | null;
};

const activeAccountSyncs = new Map<string, Promise<SyncStepResult>>();

const getErrorCode = (error: unknown): string => {
    if (error instanceof ExternalServiceError) return error.code;
    if (error instanceof Error) return error.name;
    return 'EMAIL_SYNC_FAILED';
};

const providerToServiceType = (provider: AuthStartQuery['provider']): EmailServiceType =>
    provider === 'outlook' ? EmailServiceType.OFFICE365 : EmailServiceType.GOOGLE;

const toAurinkoServiceType = (serviceType: EmailServiceType): AurinkoServiceType =>
    serviceType === EmailServiceType.OFFICE365 ? 'Office365' : 'Google';

const normalizeServiceType = (value: unknown, fallback: EmailServiceType): EmailServiceType => {
    const text = String(value || '').toLowerCase();
    if (text.includes('office')) return EmailServiceType.OFFICE365;
    if (text.includes('google')) return EmailServiceType.GOOGLE;
    return fallback;
};

const mapFolderKey = (value: string): EmailFolderWellKnown | null => {
    const key = value.trim().toLowerCase();
    if (key.includes('inbox')) return EmailFolderWellKnown.INBOX;
    if (key.includes('draft')) return EmailFolderWellKnown.DRAFTS;
    if (key.includes('sent')) return EmailFolderWellKnown.SENT;
    if (key.includes('trash') || key.includes('deleted')) return EmailFolderWellKnown.DELETED;
    if (key.includes('junk') || key.includes('spam')) return EmailFolderWellKnown.JUNK;
    if (key.includes('archive') || key.includes('all mail')) return EmailFolderWellKnown.ARCHIVE;
    return null;
};

const uiFolderToWellKnown = (value: MessageListQuery['folderKey']): EmailFolderWellKnown => {
    const map = {
        inbox: EmailFolderWellKnown.INBOX,
        drafts: EmailFolderWellKnown.DRAFTS,
        sent: EmailFolderWellKnown.SENT,
        deleted: EmailFolderWellKnown.DELETED,
        junk: EmailFolderWellKnown.JUNK,
        archive: EmailFolderWellKnown.ARCHIVE,
    } as const;
    return map[value];
};

const getFallbackProviderFolderId = (
    serviceType: EmailServiceType,
    wellKnownKey: EmailFolderWellKnown
): string => {
    if (serviceType === EmailServiceType.GOOGLE) {
        const gmailMap = {
            [EmailFolderWellKnown.INBOX]: 'INBOX',
            [EmailFolderWellKnown.DRAFTS]: 'DRAFT',
            [EmailFolderWellKnown.SENT]: 'SENT',
            [EmailFolderWellKnown.DELETED]: 'TRASH',
            [EmailFolderWellKnown.JUNK]: 'SPAM',
            [EmailFolderWellKnown.ARCHIVE]: 'ARCHIVE',
        } as const;
        return gmailMap[wellKnownKey];
    }

    const graphMap = {
        [EmailFolderWellKnown.INBOX]: 'inbox',
        [EmailFolderWellKnown.DRAFTS]: 'drafts',
        [EmailFolderWellKnown.SENT]: 'sentitems',
        [EmailFolderWellKnown.DELETED]: 'deleteditems',
        [EmailFolderWellKnown.JUNK]: 'junkemail',
        [EmailFolderWellKnown.ARCHIVE]: 'archive',
    } as const;
    return graphMap[wellKnownKey];
};

const parseDate = (value?: string): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getAddressName = (address?: AurinkoEmailAddress): string | null =>
    address?.name || address?.address || address?.raw || null;

const getAddressEmail = (address?: AurinkoEmailAddress): string | null =>
    address?.address || address?.raw || null;

const toAddressJson = (addresses?: AurinkoEmailAddress[]): Prisma.InputJsonValue =>
    (addresses || []).map((item) => ({
        name: item.name || null,
        address: item.address || item.raw || '',
        raw: item.raw || null,
    }));

const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const uniqueStrings = (values: Array<string | null | undefined>): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        const text = value?.trim();
        if (!text) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(text);
    }
    return result;
};

const asEmailAddressArray = (value: unknown): CachedEmailAddress[] => {
    if (!Array.isArray(value)) return [];

    return value
        .map((item): CachedEmailAddress | null => {
            if (!item || typeof item !== 'object') return null;
            const record = item as Record<string, unknown>;
            const address = typeof record.address === 'string' ? record.address : null;
            const raw = typeof record.raw === 'string' ? record.raw : null;
            const name = typeof record.name === 'string' ? record.name : null;
            if (!address && !raw) return null;
            return { name, address, raw };
        })
        .filter((item): item is CachedEmailAddress => item !== null);
};

const extractEmailAddress = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    const angleMatch = trimmed.match(/<([^<>@\s]+@[^<>\s]+)>/);
    if (angleMatch?.[1]) return angleMatch[1];
    const looseMatch = trimmed.match(/[^\s<>@]+@[^\s<>@]+/);
    return looseMatch?.[0] || null;
};

const toOutgoingAddress = (address: CachedEmailAddress): AurinkoEmailAddress | null => {
    const value = extractEmailAddress(address.address) || extractEmailAddress(address.raw);
    if (!value) return null;
    return {
        name: address.name || undefined,
        address: value,
    };
};

const uniqueAddresses = (addresses: AurinkoEmailAddress[]): AurinkoEmailAddress[] => {
    const seen = new Set<string>();
    const result: AurinkoEmailAddress[] = [];

    for (const address of addresses) {
        const value = address.address || address.raw;
        if (!value) continue;
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ name: address.name, address: value });
    }

    return result;
};

const isAccountAddress = (
    address: string | null | undefined,
    account: Pick<EmailAccount, 'email' | 'mailboxAddress'>
): boolean => {
    if (!address) return false;
    const value = address.toLowerCase();
    return [account.email, account.mailboxAddress]
        .filter((accountAddress): accountAddress is string => Boolean(accountAddress))
        .some((accountAddress) => accountAddress.toLowerCase() === value);
};

const buildReplyRecipients = (
    account: Pick<EmailAccount, 'email' | 'mailboxAddress'>,
    message: Pick<EmailMessageCache, 'fromName' | 'fromEmail' | 'to' | 'replyTo'>,
    requestedTo?: AurinkoEmailAddress[]
): AurinkoEmailAddress[] => {
    if (requestedTo?.length) return uniqueAddresses(requestedTo);

    const replyToRecipients = asEmailAddressArray(message.replyTo)
        .map(toOutgoingAddress)
        .filter((address): address is AurinkoEmailAddress => Boolean(address))
        .filter((address) => !isAccountAddress(address.address || address.raw, account));

    if (replyToRecipients.length > 0) return uniqueAddresses(replyToRecipients);

    if (message.fromEmail && !isAccountAddress(message.fromEmail, account)) {
        return [{ name: message.fromName || undefined, address: message.fromEmail }];
    }

    const originalRecipients = asEmailAddressArray(message.to)
        .map(toOutgoingAddress)
        .filter((address): address is AurinkoEmailAddress => Boolean(address))
        .filter((address) => !isAccountAddress(address.address || address.raw, account));

    return uniqueAddresses(originalRecipients);
};

const withReplySubject = (subject?: string | null): string => {
    const value = subject?.trim();
    if (!value) return 'Re:';
    return /^re:/i.test(value) ? value : `Re: ${value}`;
};

const getWebhookUrl = (): string | null => {
    const explicit = process.env.AURINKO_WEBHOOK_URL?.trim();
    if (explicit) return explicit;

    const publicUrl =
        process.env.PUBLIC_API_URL?.trim() || process.env.BETTER_AUTH_BASE_URL?.trim();
    if (!publicUrl) return null;

    return `${publicUrl.replace(/\/+$/, '')}/api/v1/email/webhooks/aurinko`;
};

const getFrontendUrl = (redirectTo?: string | null): string => {
    const clientUrl = process.env.CLIENT_URL?.trim() || FRONTEND_FALLBACK_URL;
    if (!redirectTo) return clientUrl;

    try {
        return new URL(redirectTo).toString();
    } catch {
        return new URL(
            redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`,
            clientUrl
        ).toString();
    }
};

const getAccountSlug = (account: Pick<EmailAccount, 'mailboxAddress' | 'email'>): string => {
    const address = account.mailboxAddress || account.email;
    const localPart = address.split('@')[0] || address;
    const slug = localPart
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return slug || account.email;
};

const getConnectedAccountRedirectUrl = (
    redirectTo: string | null | undefined,
    account: Pick<EmailAccount, 'mailboxAddress' | 'email'>
): string => {
    const baseUrl = getFrontendUrl(redirectTo);
    const url = new URL(baseUrl);
    url.pathname = '/app/email/accounts/' + encodeURIComponent(getAccountSlug(account));
    url.search = '';
    url.hash = '';
    return url.toString();
};

const getLatestConnectedAccountRedirectUrl = async (): Promise<string> => {
    const account = await prisma.emailAccount.findFirst({
        where: { status: EmailAccountStatus.CONNECTED },
        orderBy: { updatedAt: 'desc' },
        select: { mailboxAddress: true, email: true },
    });

    return account ? getConnectedAccountRedirectUrl(null, account) : getFrontendUrl();
};

const getAuthFailureMessage = (query: AuthCallbackQuery, error?: unknown): string => {
    const callbackDetails = (query as Record<string, unknown>).details;
    const callbackError = (query as Record<string, unknown>).error_description || query.error;

    if (typeof callbackDetails === 'string' && callbackDetails.trim()) {
        return callbackDetails.trim();
    }

    if (typeof callbackError === 'string' && callbackError.trim()) {
        return callbackError.trim();
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }

    return 'Email account connection failed.';
};

const isSuccessfulCallbackReplay = (query: AuthCallbackQuery, error?: unknown): boolean => {
    if ((query as Record<string, unknown>).status !== 'success' || !query.code) return false;
    if (!error) return true;

    const message = error instanceof Error ? error.message : String(error);
    return /code\.expired|invalid.*code|authorization state is invalid or expired/i.test(message);
};

const getAuthFailureRedirectUrl = async (
    query: AuthCallbackQuery,
    error?: unknown
): Promise<string> => {
    if (isSuccessfulCallbackReplay(query, error)) {
        return getLatestConnectedAccountRedirectUrl();
    }

    const oauthState = await prisma.emailOAuthState.findUnique({
        where: { state: query.state },
        select: { redirectTo: true },
    });
    const url = new URL(getFrontendUrl(oauthState?.redirectTo));

    url.searchParams.set('emailAuth', 'error');
    url.searchParams.set('message', getAuthFailureMessage(query, error));

    const requestId = (query as Record<string, unknown>).requestId;
    if (typeof requestId === 'string' && requestId.trim()) {
        url.searchParams.set('requestId', requestId.trim());
    }

    await prisma.emailOAuthState.deleteMany({ where: { state: query.state } });

    return url.toString();
};

const getOrganizationId = async (organizationId?: string | null): Promise<string> => {
    if (organizationId) return organizationId;

    const organization = await prisma.organization.findUnique({
        where: { slug: DEFAULT_ORGANIZATION_SLUG },
        select: { id: true },
    });

    if (!organization) throw new BadRequestError('Default organization was not found');
    return organization.id;
};

const decryptAccountToken = (account: Pick<EmailAccount, 'accessToken'>): string =>
    decryptAurinkoToken(account.accessToken);

const getAccountForOrg = async (
    accountId: string,
    organizationId: string
): Promise<EmailAccount> => {
    const account = await prisma.emailAccount.findFirst({
        where: { id: accountId, organizationId, status: EmailAccountStatus.CONNECTED },
    });

    if (!account) throw new NotFoundError('Email account not found');
    return account;
};

const toAccountDto = (account: EmailAccount & { syncState?: EmailSyncState | null }) => ({
    id: account.id,
    slug: getAccountSlug(account),
    email: account.email,
    mailboxAddress: account.mailboxAddress || account.email,
    displayName: account.displayName || account.email,
    provider: account.serviceType === EmailServiceType.OFFICE365 ? 'outlook' : 'gmail',
    status: account.status,
    lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
    connectedById: account.connectedById,
    freshness: toEmailFreshness(account, account.syncState),
});

const toFolderDto = (folder: {
    id: string;
    providerId: string;
    name: string;
    fullName: string | null;
    parentId?: string | null;
    sysLabel?: string | null;
    wellKnownKey: EmailFolderWellKnown | null;
    isFolder?: boolean;
    isLabel?: boolean;
    totalCount: number;
    unreadCount: number;
}) => ({
    id: folder.id,
    providerId: folder.providerId,
    name: folder.name,
    fullName: folder.fullName,
    parentId: folder.parentId ?? null,
    sysLabel: folder.sysLabel ?? null,
    key: folder.wellKnownKey?.toLowerCase() ?? null,
    isFolder: folder.isFolder ?? true,
    isLabel: folder.isLabel ?? false,
    totalCount: folder.totalCount,
    unreadCount: folder.unreadCount,
});

const toVirtualFolder = (
    account: Pick<EmailAccount, 'id' | 'serviceType'>,
    wellKnownKey: EmailFolderWellKnown,
    providerId?: string
): AurinkoFolder => ({
    id: providerId || getFallbackProviderFolderId(account.serviceType, wellKnownKey),
    name: WELL_KNOWN_FOLDER_LABELS[wellKnownKey],
    fullName: WELL_KNOWN_FOLDER_LABELS[wellKnownKey],
    sysLabel: wellKnownKey.toLowerCase(),
    isFolder: account.serviceType === EmailServiceType.OFFICE365,
    isLabel: account.serviceType === EmailServiceType.GOOGLE,
});

const formatSize = (value: number | null): string | undefined => {
    if (!value) return undefined;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const toMessageDto = (message: CachedMessageWithRelations) => ({
    id: message.id,
    providerId: message.providerId,
    threadId: message.threadId,
    senderName: message.fromName || message.fromEmail || 'Unknown sender',
    senderEmail: message.fromEmail || '',
    subject: message.subject || '(No subject)',
    preview: message.preview || '',
    receivedAt: (message.receivedAt || message.sentAt || message.createdAt).toISOString(),
    folderId: message.folderId,
    folder: message.folder?.wellKnownKey?.toLowerCase() || 'inbox',
    mailbox: message.accountId,
    unread: message.unread,
    keywords: message.keywords,
    attachmentCount: message.attachmentCount,
    body: [message.bodyHtml || message.bodyText || message.preview || ''],
    attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        providerId: attachment.providerId,
        name: attachment.name,
        size: formatSize(attachment.size),
        mimeType: attachment.mimeType,
    })),
});

type CachedMessageSummary = Pick<
    EmailMessageCache,
    | 'id'
    | 'providerId'
    | 'threadId'
    | 'conversationKey'
    | 'fromName'
    | 'fromEmail'
    | 'subject'
    | 'preview'
    | 'receivedAt'
    | 'sentAt'
    | 'createdAt'
    | 'folderId'
    | 'accountId'
    | 'keywords'
    | 'attachmentCount'
> & {
    folder: { wellKnownKey: EmailFolderWellKnown | null } | null;
};

const toMessageSummaryDto = (
    message: CachedMessageSummary,
    conversation: Pick<ConversationPageRow, 'threadMessageCount' | 'unread'>
) => ({
    id: message.id,
    providerId: message.providerId,
    threadId: message.threadId,
    conversationKey: message.conversationKey,
    senderName: message.fromName || message.fromEmail || 'Unknown sender',
    senderEmail: message.fromEmail || '',
    subject: message.subject || '(No subject)',
    preview: message.preview || '',
    receivedAt: (message.receivedAt || message.sentAt || message.createdAt).toISOString(),
    folderId: message.folderId,
    folder: message.folder?.wellKnownKey?.toLowerCase() || 'inbox',
    mailbox: message.accountId,
    unread: conversation.unread,
    keywords: message.keywords,
    attachmentCount: message.attachmentCount,
    threadMessageCount: conversation.threadMessageCount,
});

const toThreadMessageDto = (message: CachedMessageWithRelations) => ({
    id: message.id,
    providerId: message.providerId,
    senderName: message.fromName || message.fromEmail || 'Unknown sender',
    senderEmail: message.fromEmail || '',
    recipientName: 'Elli Team',
    recipientEmail: '',
    sentAt: (message.sentAt || message.receivedAt || message.createdAt).toISOString(),
    folderId: message.folderId,
    keywords: message.keywords,
    body: [message.bodyHtml || message.bodyText || message.preview || ''],
    attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        providerId: attachment.providerId,
        name: attachment.name,
        size: formatSize(attachment.size),
        mimeType: attachment.mimeType,
    })),
});

const getWellKnownFolder = async (
    account: Pick<EmailAccount, 'id' | 'serviceType'>,
    wellKnownKey: EmailFolderWellKnown
) => {
    let folder = await prisma.emailFolderCache.findFirst({
        where: { accountId: account.id, wellKnownKey },
    });

    if (!folder) {
        const virtualFolder = toVirtualFolder(account, wellKnownKey);
        await upsertFolder(account.id, virtualFolder, { [virtualFolder.id]: wellKnownKey });
        folder = await prisma.emailFolderCache.findUnique({
            where: {
                accountId_providerId: {
                    accountId: account.id,
                    providerId: virtualFolder.id,
                },
            },
        });
    }

    if (!folder)
        throw new NotFoundError(`${WELL_KNOWN_FOLDER_LABELS[wellKnownKey]} folder not found`);
    return folder;
};

type ConversationPageRow = {
    id: string;
    conversationKey: string;
    threadMessageCount: number;
    unread: boolean;
};

const getConversationPage = async (accountId: string, query: MessageListQuery) => {
    const folderFilter = query.folderId
        ? Prisma.sql`AND message."folderId" = ${query.folderId}`
        : Prisma.sql`AND folder."wellKnownKey" = ${uiFolderToWellKnown(query.folderKey)}::"EmailFolderWellKnown"`;
    const search = query.search?.trim();
    const searchFilter = search
        ? Prisma.sql`AND (
              message."subject" ILIKE ${`%${search}%`}
              OR message."preview" ILIKE ${`%${search}%`}
              OR message."fromName" ILIKE ${`%${search}%`}
              OR message."fromEmail" ILIKE ${`%${search}%`}
          )`
        : Prisma.empty;
    const offset = (query.page - 1) * query.size;

    const rows = await prisma.$queryRaw<ConversationPageRow[]>`
        WITH ranked AS (
            SELECT
                message."id",
                message."conversationKey",
                COUNT(*) OVER (PARTITION BY message."conversationKey")::integer AS "threadMessageCount",
                BOOL_OR(message."unread") OVER (PARTITION BY message."conversationKey") AS "unread",
                ROW_NUMBER() OVER (
                    PARTITION BY message."conversationKey"
                    ORDER BY COALESCE(message."receivedAt", message."sentAt", message."createdAt") DESC,
                             message."createdAt" DESC
                ) AS row_number,
                COALESCE(message."receivedAt", message."sentAt", message."createdAt") AS sort_time
            FROM "EmailMessageCache" AS message
            LEFT JOIN "EmailFolderCache" AS folder ON folder."id" = message."folderId"
            WHERE message."accountId" = ${accountId}
              AND message."deletedAt" IS NULL
              ${folderFilter}
              ${searchFilter}
        )
        SELECT "id", "conversationKey", "threadMessageCount", "unread"
        FROM ranked
        WHERE row_number = 1
        ORDER BY sort_time DESC
        OFFSET ${offset}
        LIMIT ${query.size}
    `;

    const [countRow] = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(DISTINCT message."conversationKey")::integer AS count
        FROM "EmailMessageCache" AS message
        LEFT JOIN "EmailFolderCache" AS folder ON folder."id" = message."folderId"
        WHERE message."accountId" = ${accountId}
          AND message."deletedAt" IS NULL
          ${folderFilter}
          ${searchFilter}
    `;

    return { rows, count: countRow?.count || 0 };
};

const getMessageKeywords = (message: AurinkoMessage): string[] =>
    uniqueStrings([...(message.keywords || []), ...(message.categories || [])]);

const isGmailUserLabel = (label: AurinkoGmailLabel): boolean => {
    if (label.type && label.type.toLowerCase() === 'system') return false;
    const name = label.name.toUpperCase();
    return (
        !['INBOX', 'SENT', 'TRASH', 'SPAM', 'DRAFT', 'UNREAD', 'STARRED', 'IMPORTANT'].includes(
            name
        ) && !name.startsWith('CATEGORY_')
    );
};

const toGraphTagDto = (category: AurinkoGraphCategory): EmailTagDto => ({
    id: category.displayName,
    providerId: category.displayName,
    name: category.displayName,
    color: category.color || null,
    source: 'provider',
});

const toGmailTagDto = (label: AurinkoGmailLabel): EmailTagDto => ({
    id: label.id,
    providerId: label.id,
    name: label.name,
    color: null,
    source: 'provider',
});

const mergeTags = (providerTags: EmailTagDto[], cachedKeywords: string[]): EmailTagDto[] => {
    const tags = new Map<string, EmailTagDto>();
    for (const tag of providerTags) {
        tags.set(tag.name.toLowerCase(), tag);
        tags.set(tag.providerId.toLowerCase(), tag);
    }

    for (const keyword of cachedKeywords) {
        const key = keyword.toLowerCase();
        if (tags.has(key)) continue;
        tags.set(key, {
            id: keyword,
            providerId: keyword,
            name: keyword,
            color: null,
            source: 'cache',
        });
    }

    return Array.from(
        new Map(Array.from(tags.values()).map((tag) => [tag.name.toLowerCase(), tag])).values()
    ).sort((a, b) => a.name.localeCompare(b.name));
};

const getCachedKeywords = async (accountId: string): Promise<string[]> => {
    const rows = await prisma.$queryRaw<Array<{ keyword: string }>>`
        SELECT DISTINCT unnest("keywords") AS keyword
        FROM "EmailMessageCache"
        WHERE "accountId" = ${accountId}
          AND "deletedAt" IS NULL
    `;
    return uniqueStrings(rows.map((row) => row.keyword));
};

const cacheProviderTags = async (accountId: string, tags: EmailTagDto[]) => {
    if (tags.length === 0) return;
    await prisma.$transaction(
        tags.map((tag) =>
            prisma.emailTagCache.upsert({
                where: { accountId_providerId: { accountId, providerId: tag.providerId } },
                create: {
                    id: generateNanoId(),
                    accountId,
                    providerId: tag.providerId,
                    name: tag.name,
                    color: tag.color,
                    source: tag.source,
                },
                update: { name: tag.name, color: tag.color, source: tag.source },
            })
        )
    );
};

const syncProviderTags = async (account: EmailAccount, accessToken: string) => {
    const tags =
        account.serviceType === EmailServiceType.OFFICE365
            ? (await AurinkoClient.listGraphCategories(accessToken)).value?.map(toGraphTagDto) || []
            : ((await AurinkoClient.listGmailLabels(accessToken)).labels || [])
                  .filter(isGmailUserLabel)
                  .map(toGmailTagDto);
    await cacheProviderTags(account.id, tags);
};

const upsertFolder = async (
    accountId: string,
    folder: AurinkoFolder,
    wellKnownByProviderId: Record<string, EmailFolderWellKnown>
) => {
    const providerId = folder.id;
    const inferredKey =
        wellKnownByProviderId[providerId] ||
        mapFolderKey(
            folder.sysLabel || folder.fullName || folder.name || folder.displayName || providerId
        );
    const folderName = folder.name || folder.displayName || folder.fullName || providerId;

    await prisma.emailFolderCache.upsert({
        where: { accountId_providerId: { accountId, providerId } },
        create: {
            id: generateNanoId(),
            accountId,
            providerId,
            name: folderName,
            fullName: folder.fullName || null,
            parentId: folder.parentId || null,
            sysLabel: folder.sysLabel || null,
            wellKnownKey: inferredKey,
            isFolder: folder.isFolder ?? true,
            isLabel: folder.isLabel ?? false,
            raw: toJson(folder),
            lastSyncedAt: new Date(),
        },
        update: {
            name: folderName,
            fullName: folder.fullName || null,
            parentId: folder.parentId || null,
            sysLabel: folder.sysLabel || null,
            wellKnownKey: inferredKey,
            isFolder: folder.isFolder ?? true,
            isLabel: folder.isLabel ?? false,
            raw: toJson(folder),
            lastSyncedAt: new Date(),
        },
    });
};

const toMessageCacheData = (message: AurinkoMessage, folderId: string | null) => {
    const unread = (message.sysLabels || []).some((label) => label.toLowerCase() === 'unread');
    const attachments = message.attachments || [];
    return {
        threadId: message.threadId || null,
        conversationKey: message.threadId || message.id,
        folderId,
        internetMessageId: message.internetMessageId || null,
        subject: message.subject || null,
        preview: message.bodySnippet || null,
        bodyHtml: message.body || null,
        fromName: getAddressName(message.from),
        fromEmail: getAddressEmail(message.from),
        to: toAddressJson(message.to),
        cc: toAddressJson(message.cc),
        bcc: toAddressJson(message.bcc),
        replyTo: toAddressJson(message.replyTo),
        sentAt: parseDate(message.sentAt),
        receivedAt: parseDate(message.receivedAt),
        providerCreatedAt: parseDate(message.createdTime),
        providerUpdatedAt: parseDate(message.lastModifiedTime),
        unread,
        hasAttachments: message.hasAttachments ?? attachments.length > 0,
        attachmentCount: attachments.length,
        sysLabels: message.sysLabels || [],
        keywords: getMessageKeywords(message),
        webLink: message.webLink || null,
        raw: toJson({
            omitted: message.omitted || [],
            nativeProperties: message.nativeProperties || null,
        }),
        deletedAt: null,
        lastSyncedAt: new Date(),
    };
};

const upsertMessages = async (accountId: string, messages: AurinkoMessage[]) => {
    if (messages.length === 0) return;
    const providerIds = messages.map((message) => message.id);
    const [folders, existingMessages] = await Promise.all([
        prisma.emailFolderCache.findMany({
            where: { accountId },
            select: { id: true, providerId: true, wellKnownKey: true },
        }),
        prisma.emailMessageCache.findMany({
            where: { accountId, providerId: { in: providerIds } },
            select: { id: true, providerId: true },
        }),
    ]);
    const foldersByProviderId = new Map(folders.map((folder) => [folder.providerId, folder.id]));
    const foldersByWellKnown = new Map(
        folders.flatMap((folder) => (folder.wellKnownKey ? [[folder.wellKnownKey, folder.id]] : []))
    );
    const localIds = new Map(existingMessages.map((message) => [message.providerId, message.id]));

    const getFolderId = (message: AurinkoMessage): string | null => {
        const direct = message.folderId ? foldersByProviderId.get(message.folderId) : undefined;
        if (direct) return direct;
        const labels = (message.sysLabels || []).map((label) => label.toLowerCase());
        const has = (value: string) => labels.some((label) => label.includes(value));
        const wellKnown = has('inbox')
            ? EmailFolderWellKnown.INBOX
            : has('draft')
              ? EmailFolderWellKnown.DRAFTS
              : has('sent')
                ? EmailFolderWellKnown.SENT
                : has('trash') || has('deleted')
                  ? EmailFolderWellKnown.DELETED
                  : has('junk') || has('spam')
                    ? EmailFolderWellKnown.JUNK
                    : labels.length > 0
                      ? EmailFolderWellKnown.ARCHIVE
                      : null;
        return wellKnown ? foldersByWellKnown.get(wellKnown) || null : null;
    };

    for (const message of messages) {
        if (!localIds.has(message.id)) localIds.set(message.id, generateNanoId());
    }

    const existingAttachments = await prisma.emailAttachmentCache.findMany({
        where: { messageId: { in: Array.from(localIds.values()) } },
        select: {
            messageId: true,
            providerId: true,
            name: true,
            mimeType: true,
            size: true,
            inline: true,
            contentId: true,
        },
    });
    const attachmentsByMessageId = new Map<string, typeof existingAttachments>();
    for (const attachment of existingAttachments) {
        const group = attachmentsByMessageId.get(attachment.messageId) || [];
        group.push(attachment);
        attachmentsByMessageId.set(attachment.messageId, group);
    }
    const changedAttachmentMessageIds = messages.flatMap((message) => {
        const messageId = localIds.get(message.id)!;
        const existing = attachmentsByMessageId.get(messageId) || [];
        const next = (message.attachments || []).filter((attachment) => attachment.id);
        const unchanged =
            existing.length === next.length &&
            next.every((attachment) =>
                existing.some(
                    (cached) =>
                        cached.providerId === attachment.id &&
                        cached.name === (attachment.name || 'Attachment') &&
                        cached.mimeType === (attachment.mimeType || null) &&
                        cached.size === (attachment.size || null) &&
                        cached.inline === (attachment.inline ?? false) &&
                        cached.contentId === (attachment.contentId || null)
                )
            );
        return unchanged ? [] : [messageId];
    });
    const changedAttachmentIds = new Set(changedAttachmentMessageIds);

    const upserts = messages.map((message) => {
        const data = toMessageCacheData(message, getFolderId(message));
        return prisma.emailMessageCache.upsert({
            where: { accountId_providerId: { accountId, providerId: message.id } },
            create: {
                id: localIds.get(message.id)!,
                accountId,
                providerId: message.id,
                ...data,
            },
            update: data,
        });
    });
    const attachmentRows = messages.flatMap((message) =>
        changedAttachmentIds.has(localIds.get(message.id)!)
            ? (message.attachments || [])
                  .filter((attachment) => attachment.id)
                  .map((attachment) => ({
                      id: generateNanoId(),
                      messageId: localIds.get(message.id)!,
                      providerId: attachment.id!,
                      name: attachment.name || 'Attachment',
                      mimeType: attachment.mimeType || null,
                      size: attachment.size || null,
                      inline: attachment.inline ?? false,
                      contentId: attachment.contentId || null,
                      raw: toJson(attachment),
                  }))
            : []
    );
    const operations = [
        ...upserts,
        prisma.emailAttachmentCache.deleteMany({
            where: { messageId: { in: changedAttachmentMessageIds } },
        }),
    ];
    if (attachmentRows.length > 0) {
        operations.push(prisma.emailAttachmentCache.createMany({ data: attachmentRows }));
    }
    await prisma.$transaction(operations);
};

const applyFolderCountRefresh = async (
    tx: Prisma.TransactionClient,
    accountId: string,
    folderIds?: Array<string | null>
) => {
    const ids = uniqueStrings(folderIds || []);
    const folderWhere = ids.length > 0 ? { accountId, id: { in: ids } } : { accountId };
    const folderFilter =
        ids.length > 0 ? Prisma.sql`AND folder."id" IN (${Prisma.join(ids)})` : Prisma.empty;

    await tx.emailFolderCache.updateMany({
        where: folderWhere,
        data: { totalCount: 0, unreadCount: 0 },
    });
    await tx.$executeRaw`
        UPDATE "EmailFolderCache" AS folder
        SET
            "totalCount" = counts."totalCount"::integer,
            "unreadCount" = counts."unreadCount"::integer
        FROM (
            SELECT
                "folderId",
                COUNT(*) AS "totalCount",
                COUNT(*) FILTER (WHERE "unread" = true) AS "unreadCount"
            FROM "EmailMessageCache"
            WHERE "accountId" = ${accountId}
              AND "deletedAt" IS NULL
              AND "folderId" IS NOT NULL
            GROUP BY "folderId"
        ) AS counts
        WHERE folder."id" = counts."folderId"
          AND folder."accountId" = ${accountId}
          ${folderFilter}
    `;
};

const refreshFolderCounts = async (accountId: string, folderIds?: Array<string | null>) => {
    await prisma.$transaction(async (tx) => {
        await applyFolderCountRefresh(tx, accountId, folderIds);
    });
};

const moveCachedMessage = async (
    accountId: string,
    message: Pick<EmailMessageCache, 'id' | 'folderId' | 'providerId'>,
    targetFolderId: string,
    providerId?: string
) => {
    await prisma.$transaction(async (tx) => {
        const nextProviderId = providerId || message.providerId;
        if (nextProviderId !== message.providerId) {
            const duplicate = await tx.emailMessageCache.findUnique({
                where: { accountId_providerId: { accountId, providerId: nextProviderId } },
                select: { id: true },
            });
            if (duplicate && duplicate.id !== message.id) {
                await tx.emailMessageCache.delete({ where: { id: duplicate.id } });
            }
        }
        await tx.emailMessageCache.update({
            where: { id: message.id },
            data: {
                folderId: targetFolderId,
                providerId: nextProviderId,
                deletedAt: null,
            },
        });
        await applyFolderCountRefresh(tx, accountId, [message.folderId, targetFolderId]);
    });
};

const syncFolders = async (account: EmailAccount, accessToken: string) => {
    const folders = await AurinkoClient.listFolders(accessToken);
    const wellKnown = await AurinkoClient.getWellKnownFolders(accessToken).catch((error) => {
        console.warn('[email] Well-known folder metadata unavailable', {
            accountId: account.id,
            code: getErrorCode(error),
        });
        return {};
    });

    const wellKnownByProviderId: Record<string, EmailFolderWellKnown> = {};
    for (const [key, providerId] of Object.entries(wellKnown)) {
        const mapped = mapFolderKey(key);
        if (mapped && providerId) wellKnownByProviderId[providerId] = mapped;
    }

    for (const folder of folders.records || []) {
        await upsertFolder(account.id, folder, wellKnownByProviderId);
    }

    for (const [key, providerId] of Object.entries(wellKnown)) {
        const mapped = mapFolderKey(key);
        if (!mapped || !providerId) continue;

        const existing = await prisma.emailFolderCache.findUnique({
            where: { accountId_providerId: { accountId: account.id, providerId } },
            select: { id: true },
        });
        if (!existing) {
            await upsertFolder(account.id, toVirtualFolder(account, mapped, providerId), {
                [providerId]: mapped,
            });
        }
    }

    for (const wellKnownKey of Object.values(EmailFolderWellKnown)) {
        const existing = await prisma.emailFolderCache.findFirst({
            where: { accountId: account.id, wellKnownKey },
            select: { id: true },
        });
        if (!existing) {
            const folder = toVirtualFolder(account, wellKnownKey);
            await upsertFolder(account.id, folder, { [folder.id]: wellKnownKey });
        }
    }
};

const ensureWebhookSubscription = async (account: EmailAccount, accessToken: string) => {
    const notificationUrl = getWebhookUrl();
    if (!notificationUrl) return;

    const existing = await prisma.emailWebhookSubscription.findFirst({
        where: { accountId: account.id, resource: '/email/messages', active: true },
    });
    if (existing) return;

    const subscription = await AurinkoClient.createSubscription(accessToken, notificationUrl);
    await prisma.emailWebhookSubscription.upsert({
        where: { aurinkoSubscriptionId: String(subscription.id) },
        create: {
            id: generateNanoId(),
            accountId: account.id,
            aurinkoSubscriptionId: String(subscription.id),
            resource: subscription.resource || '/email/messages',
            notificationUrl: subscription.notificationUrl || notificationUrl,
            active: subscription.active ?? true,
            failSince: parseDate(subscription.failSince),
            failDescription: subscription.failDescription || null,
            raw: toJson(subscription),
        },
        update: {
            resource: subscription.resource || '/email/messages',
            notificationUrl: subscription.notificationUrl || notificationUrl,
            active: subscription.active ?? true,
            failSince: parseDate(subscription.failSince),
            failDescription: subscription.failDescription || null,
            raw: toJson(subscription),
        },
    });
};

const syncUpdatedMessages = async (
    account: EmailAccount,
    accessToken: string,
    state: Pick<
        EmailSyncState,
        'syncUpdatedToken' | 'syncUpdatedPageToken' | 'syncUpdatedNextToken'
    >,
    pageBudget = SYNC_PAGE_BUDGET
) => {
    let deltaToken = state.syncUpdatedToken;
    let pageToken = state.syncUpdatedPageToken;
    let pendingNextToken = state.syncUpdatedNextToken;
    let processed = 0;

    for (let page = 0; page < pageBudget; page += 1) {
        const response = await AurinkoClient.getUpdatedEmails(accessToken, {
            deltaToken,
            pageToken,
        });

        const messages = response.records || [];
        await upsertMessages(account.id, messages);
        processed += messages.length;

        pendingNextToken = response.nextDeltaToken || pendingNextToken;
        pageToken = response.nextPageToken || null;
        if (!pageToken) {
            deltaToken = pendingNextToken || deltaToken;
            pendingNextToken = null;
        }

        await prisma.emailSyncState.update({
            where: { accountId: account.id },
            data: {
                syncUpdatedToken: deltaToken,
                syncUpdatedPageToken: pageToken,
                syncUpdatedNextToken: pendingNextToken,
            },
        });

        if (!pageToken) break;
    }

    return { deltaToken, pageToken, pendingNextToken, processed, hasMore: Boolean(pageToken) };
};

const syncDeletedMessages = async (
    account: EmailAccount,
    accessToken: string,
    state: Pick<
        EmailSyncState,
        'syncDeletedToken' | 'syncDeletedPageToken' | 'syncDeletedNextToken'
    >,
    pageBudget = SYNC_PAGE_BUDGET
) => {
    let deltaToken = state.syncDeletedToken;
    let pageToken = state.syncDeletedPageToken;
    let pendingNextToken = state.syncDeletedNextToken;
    let processed = 0;

    for (let page = 0; page < pageBudget; page += 1) {
        const response = await AurinkoClient.getDeletedEmails(accessToken, {
            deltaToken,
            pageToken,
        });

        const ids = (response.records || []).map((record) => record.id).filter(Boolean);
        if (ids.length > 0) {
            await prisma.emailMessageCache.updateMany({
                where: { accountId: account.id, providerId: { in: ids } },
                data: { deletedAt: new Date() },
            });
            processed += ids.length;
        }

        pendingNextToken = response.nextDeltaToken || pendingNextToken;
        pageToken = response.nextPageToken || null;
        if (!pageToken) {
            deltaToken = pendingNextToken || deltaToken;
            pendingNextToken = null;
        }

        await prisma.emailSyncState.update({
            where: { accountId: account.id },
            data: {
                syncDeletedToken: deltaToken,
                syncDeletedPageToken: pageToken,
                syncDeletedNextToken: pendingNextToken,
            },
        });

        if (!pageToken) break;
    }

    return { deltaToken, pageToken, pendingNextToken, processed, hasMore: Boolean(pageToken) };
};

const runCacheSyncStep = async (
    account: EmailAccount,
    daysWithin = DEFAULT_SYNC_DAYS,
    allowCursorReset = true
): Promise<SyncStepResult> => {
    const accessToken = decryptAccountToken(account);
    const startedAt = new Date();
    console.info('[email] Sync step started', { accountId: account.id, daysWithin });
    const previousState = await prisma.emailSyncState.findUnique({
        where: { accountId: account.id },
    });

    if (
        previousState &&
        previousState.consecutiveFailures >= 3 &&
        previousState.lastStartedAt &&
        Date.now() - previousState.lastStartedAt.getTime() < EMAIL_PROVIDER_COOLDOWN_MS
    ) {
        throw new ExternalServiceError(
            'The email provider is cooling down after repeated connection failures.',
            { code: 'EMAIL_PROVIDER_COOLDOWN', status: 503 }
        );
    }

    await prisma.emailSyncState.upsert({
        where: { accountId: account.id },
        create: {
            id: generateNanoId(),
            accountId: account.id,
            lastSyncStatus: EmailSyncStatus.SYNCING,
            lastStartedAt: startedAt,
        },
        update: {
            lastSyncStatus: EmailSyncStatus.SYNCING,
            lastStartedAt: startedAt,
            lastSyncError: null,
            lastSyncErrorCode: null,
        },
    });

    try {
        const shouldRefreshFolders =
            !previousState?.lastCompletedAt ||
            Date.now() - previousState.lastCompletedAt.getTime() > EMAIL_FOLDER_REFRESH_WINDOW_MS;
        if (shouldRefreshFolders) {
            await syncFolders(account, accessToken);
            await syncProviderTags(account, accessToken).catch((error) => {
                console.warn('[email] Provider tag refresh unavailable', {
                    accountId: account.id,
                    code: getErrorCode(error),
                });
            });
        }

        let currentState = await prisma.emailSyncState.findUnique({
            where: { accountId: account.id },
        });
        if (!currentState) throw new BadRequestError('Email sync state was not created');

        if (!currentState.syncUpdatedToken || !currentState.syncDeletedToken) {
            const syncStart = await AurinkoClient.startEmailSync(accessToken, daysWithin);
            currentState = await prisma.emailSyncState.update({
                where: { accountId: account.id },
                data: {
                    syncUpdatedToken: syncStart.syncUpdatedToken,
                    syncUpdatedPageToken: null,
                    syncUpdatedNextToken: null,
                    syncDeletedToken: syncStart.syncDeletedToken,
                    syncDeletedPageToken: null,
                    syncDeletedNextToken: null,
                },
            });
        }

        const updated = await syncUpdatedMessages(account, accessToken, currentState);
        currentState = (await prisma.emailSyncState.findUnique({
            where: { accountId: account.id },
        }))!;
        const deleted = await syncDeletedMessages(account, accessToken, currentState);
        await refreshFolderCounts(account.id);
        const hasMore = updated.hasMore || deleted.hasMore;

        const completedAt = new Date();
        await prisma.emailSyncState.update({
            where: { accountId: account.id },
            data: {
                lastSyncStatus: hasMore ? EmailSyncStatus.PARTIAL : EmailSyncStatus.READY,
                lastCompletedAt: hasMore ? previousState?.lastCompletedAt : completedAt,
                lastSyncError: null,
                lastSyncErrorCode: null,
                consecutiveFailures: 0,
            },
        });

        if (!hasMore) {
            await Promise.all([
                prisma.emailAccount.update({
                    where: { id: account.id },
                    data: { lastSyncedAt: completedAt, status: EmailAccountStatus.CONNECTED },
                }),
                ensureWebhookSubscription(account, accessToken).catch((error) => {
                    console.warn('[email] Aurinko webhook subscription unavailable', {
                        accountId: account.id,
                        code: getErrorCode(error),
                    });
                }),
            ]);
        }

        const result: SyncStepResult = {
            synced: !hasMore,
            status: hasMore ? 'partial' : 'ready',
            processed: updated.processed + deleted.processed,
            hasMore,
            lastSyncedAt: hasMore
                ? previousState?.lastCompletedAt?.toISOString() || null
                : completedAt.toISOString(),
        };
        console.info('[email] Sync step completed', {
            accountId: account.id,
            processed: result.processed,
            hasMore: result.hasMore,
            durationMs: Date.now() - startedAt.getTime(),
        });
        return result;
    } catch (error) {
        if (
            allowCursorReset &&
            error instanceof ExternalServiceError &&
            error.upstreamStatus === 410
        ) {
            await prisma.emailSyncState.updateMany({
                where: { accountId: account.id },
                data: {
                    syncUpdatedToken: null,
                    syncUpdatedPageToken: null,
                    syncUpdatedNextToken: null,
                    syncDeletedToken: null,
                    syncDeletedPageToken: null,
                    syncDeletedNextToken: null,
                    lastSyncStatus: EmailSyncStatus.IDLE,
                    lastSyncError: null,
                    lastSyncErrorCode: null,
                },
            });
            return runCacheSyncStep(account, daysWithin, false);
        }
        await prisma.emailSyncState.updateMany({
            where: { accountId: account.id },
            data: {
                lastSyncStatus: EmailSyncStatus.ERROR,
                lastSyncError: error instanceof Error ? error.message : 'Email sync failed',
                lastSyncErrorCode: getErrorCode(error),
                consecutiveFailures: { increment: 1 },
            },
        });
        console.warn('[email] Sync step failed', {
            accountId: account.id,
            code: getErrorCode(error),
            durationMs: Date.now() - startedAt.getTime(),
        });
        throw error;
    }
};

const runCacheSync = (account: EmailAccount, daysWithin = DEFAULT_SYNC_DAYS) => {
    const existing = activeAccountSyncs.get(account.id);
    if (existing) return existing;

    const sync = runCacheSyncStep(account, daysWithin).finally(() => {
        if (activeAccountSyncs.get(account.id) === sync) activeAccountSyncs.delete(account.id);
    });
    activeAccountSyncs.set(account.id, sync);
    return sync;
};

export const EmailService = {
    async getRequestContext(input: {
        userId: string;
        organizationId?: string | null;
    }): Promise<RequestContext> {
        return {
            userId: input.userId,
            organizationId: await getOrganizationId(input.organizationId),
        };
    },

    async createAuthorizationUrl(ctx: RequestContext, query: AuthStartQuery) {
        const serviceType = providerToServiceType(query.provider);
        const state = crypto.randomUUID();

        await prisma.emailOAuthState.deleteMany({
            where: { userId: ctx.userId, expiresAt: { lt: new Date() } },
        });

        await prisma.emailOAuthState.create({
            data: {
                id: generateNanoId(),
                state,
                organizationId: ctx.organizationId,
                userId: ctx.userId,
                serviceType,
                redirectTo: query.redirectTo || null,
                expiresAt: addMinutes(new Date(), 15),
            },
        });

        return {
            authorizationUrl: AurinkoClient.createAuthorizationUrl({
                serviceType: toAurinkoServiceType(serviceType),
                state,
                clientOrgId: ctx.organizationId,
                loginHint: query.loginHint,
            }),
        };
    },

    getAuthFailureRedirectUrl,

    async handleCallback(query: AuthCallbackQuery) {
        const oauthState = await prisma.emailOAuthState.findUnique({
            where: { state: query.state },
        });

        if (!oauthState || oauthState.expiresAt < new Date()) {
            if (isSuccessfulCallbackReplay(query)) {
                return { redirectUrl: await getLatestConnectedAccountRedirectUrl() };
            }
            throw new BadRequestError('Aurinko authorization state is invalid or expired');
        }

        if (query.error) {
            await prisma.emailOAuthState.deleteMany({ where: { state: query.state } });
            throw new BadRequestError(query.error_description || query.error);
        }

        if (!query.code) {
            throw new BadRequestError('Aurinko authorization code was not returned');
        }

        const token = await AurinkoClient.exchangeCode(query.code);
        const accountInfo = await AurinkoClient.getAccount(token.accessToken);
        const serviceType = normalizeServiceType(accountInfo.serviceType, oauthState.serviceType);
        const aurinkoAccountId = String(token.accountId || accountInfo.id);
        const email =
            accountInfo.mailboxAddress ||
            accountInfo.email ||
            accountInfo.email2 ||
            `${aurinkoAccountId}@aurinko.local`;

        const account = await prisma.emailAccount.upsert({
            where: { aurinkoAccountId },
            create: {
                id: generateNanoId(),
                organizationId: oauthState.organizationId,
                aurinkoAccountId,
                aurinkoUserId: token.userId || null,
                serviceType,
                status: EmailAccountStatus.CONNECTED,
                email,
                mailboxAddress: accountInfo.mailboxAddress || email,
                displayName: accountInfo.name || accountInfo.name2 || email,
                scope: Array.isArray(accountInfo.scopes)
                    ? accountInfo.scopes.join(' ')
                    : 'Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts',
                accessToken: encryptAurinkoToken(token.accessToken),
                connectedById: oauthState.userId,
                disconnectedAt: null,
            },
            update: {
                organizationId: oauthState.organizationId,
                aurinkoUserId: token.userId || null,
                serviceType,
                status: EmailAccountStatus.CONNECTED,
                email,
                mailboxAddress: accountInfo.mailboxAddress || email,
                displayName: accountInfo.name || accountInfo.name2 || email,
                accessToken: encryptAurinkoToken(token.accessToken),
                connectedById: oauthState.userId,
                disconnectedAt: null,
            },
        });

        await prisma.emailOAuthState.deleteMany({ where: { state: query.state } });
        await prisma.emailSyncState.upsert({
            where: { accountId: account.id },
            create: {
                id: generateNanoId(),
                accountId: account.id,
                lastSyncStatus: EmailSyncStatus.IDLE,
            },
            update: {
                lastSyncStatus: EmailSyncStatus.IDLE,
                lastSyncError: null,
                lastSyncErrorCode: null,
                consecutiveFailures: 0,
            },
        });

        return {
            redirectUrl: getConnectedAccountRedirectUrl(oauthState.redirectTo, account),
            account: toAccountDto(account),
        };
    },

    async listAccounts(ctx: RequestContext) {
        const accounts = await prisma.emailAccount.findMany({
            where: { organizationId: ctx.organizationId, status: EmailAccountStatus.CONNECTED },
            orderBy: [{ email: 'asc' }],
            include: { syncState: true },
        });

        return accounts.map(toAccountDto);
    },

    async disconnectAccount(ctx: RequestContext, accountId: string) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        try {
            await AurinkoClient.deleteAccount(decryptAccountToken(account));
        } catch (error) {
            // Old accounts can become undecryptable after Aurinko/encryption credentials change.
            // Local disconnect should still succeed so stale accounts stop breaking the UI.
            console.warn('[email] Provider disconnect failed; continuing locally', {
                accountId: account.id,
                code: getErrorCode(error),
            });
        }

        await prisma.$transaction([
            prisma.emailWebhookSubscription.updateMany({
                where: { accountId: account.id },
                data: { active: false },
            }),
            prisma.emailAccount.update({
                where: { id: account.id },
                data: { status: EmailAccountStatus.DISCONNECTED, disconnectedAt: new Date() },
            }),
        ]);

        return { disconnected: true };
    },

    async checkAccount(ctx: RequestContext, accountId: string) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const status = await AurinkoClient.getAccount(decryptAccountToken(account));
        return { account: toAccountDto(account), aurinko: status };
    },

    async syncAccount(ctx: RequestContext, accountId: string, daysWithin = DEFAULT_SYNC_DAYS) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        return runCacheSync(account, daysWithin);
    },

    async getSyncStatus(ctx: RequestContext, accountId: string) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const [syncState, messageCount, folderCount] = await Promise.all([
            prisma.emailSyncState.findUnique({ where: { accountId } }),
            prisma.emailMessageCache.count({ where: { accountId, deletedAt: null } }),
            prisma.emailFolderCache.count({ where: { accountId } }),
        ]);
        return {
            freshness: toEmailFreshness(account, syncState),
            messageCount,
            folderCount,
            inFlight: activeAccountSyncs.has(accountId),
            resumable: Boolean(syncState?.syncUpdatedPageToken || syncState?.syncDeletedPageToken),
            consecutiveFailures: syncState?.consecutiveFailures || 0,
        };
    },

    async syncAllConnectedAccounts() {
        const accounts = await prisma.emailAccount.findMany({
            where: { status: EmailAccountStatus.CONNECTED },
        });

        const results = [];
        for (const account of accounts) {
            try {
                await runCacheSync(account);
                results.push({ accountId: account.id, synced: true });
            } catch (error) {
                results.push({
                    accountId: account.id,
                    synced: false,
                    error: error instanceof Error ? error.message : 'Sync failed',
                });
            }
        }
        return results;
    },

    async syncWebhookAccount(input: { accountId?: string; subscriptionId?: string }) {
        if (!input.accountId && !input.subscriptionId) {
            throw new BadRequestError('Aurinko webhook did not identify an email account');
        }

        const account = await prisma.emailAccount.findFirst({
            where: {
                status: EmailAccountStatus.CONNECTED,
                OR: [
                    ...(input.accountId ? [{ aurinkoAccountId: input.accountId }] : []),
                    ...(input.subscriptionId
                        ? [
                              {
                                  subscriptions: {
                                      some: { aurinkoSubscriptionId: input.subscriptionId },
                                  },
                              },
                          ]
                        : []),
                ],
            },
        });
        if (!account) throw new NotFoundError('Webhook email account was not found');

        return runCacheSync(account);
    },

    async listFolders(ctx: RequestContext, accountId: string) {
        await getAccountForOrg(accountId, ctx.organizationId);
        const folders = await prisma.emailFolderCache.findMany({
            where: { accountId },
            orderBy: [{ wellKnownKey: 'asc' }, { name: 'asc' }],
        });
        return folders.map(toFolderDto);
    },

    async listTags(ctx: RequestContext, accountId: string): Promise<EmailTagDto[]> {
        await getAccountForOrg(accountId, ctx.organizationId);
        const [providerTags, cachedKeywords] = await Promise.all([
            prisma.emailTagCache.findMany({ where: { accountId }, orderBy: { name: 'asc' } }),
            getCachedKeywords(accountId),
        ]);
        return mergeTags(
            providerTags.map((tag) => ({
                id: tag.providerId,
                providerId: tag.providerId,
                name: tag.name,
                color: tag.color,
                source: tag.source === 'provider' ? 'provider' : 'cache',
            })),
            cachedKeywords
        );
    },

    async listMessages(ctx: RequestContext, accountId: string, query: MessageListQuery) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const [{ rows, count }, syncState] = await Promise.all([
            getConversationPage(accountId, query),
            prisma.emailSyncState.findUnique({ where: { accountId } }),
        ]);
        const ids = rows.map((row) => row.id);
        const records = await prisma.emailMessageCache.findMany({
            where: { id: { in: ids }, accountId, deletedAt: null },
            select: {
                id: true,
                providerId: true,
                threadId: true,
                conversationKey: true,
                fromName: true,
                fromEmail: true,
                subject: true,
                preview: true,
                receivedAt: true,
                sentAt: true,
                createdAt: true,
                folderId: true,
                accountId: true,
                keywords: true,
                attachmentCount: true,
                folder: { select: { wellKnownKey: true } },
            },
        });
        const recordsById = new Map(records.map((record) => [record.id, record]));
        const pageRecords = rows.flatMap((conversation) => {
            const record = recordsById.get(conversation.id);
            return record ? [toMessageSummaryDto(record, conversation)] : [];
        });

        return {
            records: pageRecords,
            count,
            pagination: {
                currentPage: query.page,
                totalPages: Math.ceil(count / query.size),
                hasNextPage: query.page * query.size < count,
                hasPreviousPage: query.page > 1,
                totalItems: count,
                itemsPerPage: query.size,
            },
            freshness: toEmailFreshness(account, syncState),
        };
    },

    async createFolder(ctx: RequestContext, accountId: string, input: CreateFolderInput) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const accessToken = decryptAccountToken(account);
        const folder =
            account.serviceType === EmailServiceType.OFFICE365
                ? await AurinkoClient.createGraphFolder(accessToken, { name: input.name })
                : await AurinkoClient.createGmailLabel(accessToken, { name: input.name });

        await upsertFolder(account.id, folder, {});

        const saved = await prisma.emailFolderCache.findUnique({
            where: { accountId_providerId: { accountId, providerId: folder.id } },
        });
        if (!saved) throw new BadRequestError('Email folder was not created');

        return toFolderDto(saved);
    },

    async createTag(
        ctx: RequestContext,
        accountId: string,
        input: CreateTagInput
    ): Promise<EmailTagDto> {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const accessToken = decryptAccountToken(account);

        if (account.serviceType === EmailServiceType.OFFICE365) {
            const category = await AurinkoClient.createGraphCategory(accessToken, input);
            const tag = toGraphTagDto(category);
            await cacheProviderTags(account.id, [tag]);
            return tag;
        }

        const label = await AurinkoClient.createGmailLabel(accessToken, { name: input.name });
        const tag = toGmailTagDto(label);
        await cacheProviderTags(account.id, [tag]);
        return tag;
    },

    async updateMessageTags(
        ctx: RequestContext,
        accountId: string,
        messageId: string,
        input: UpdateMessageTagsInput
    ) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const message = await prisma.emailMessageCache.findFirst({
            where: { id: messageId, accountId, deletedAt: null },
        });
        if (!message) throw new NotFoundError('Email message not found');

        const accessToken = decryptAccountToken(account);
        const tags = await this.listTags(ctx, accountId);
        const tagsByIdentifier = new Map<string, EmailTagDto>();
        for (const tag of tags) {
            tagsByIdentifier.set(tag.id.toLowerCase(), tag);
            tagsByIdentifier.set(tag.providerId.toLowerCase(), tag);
            tagsByIdentifier.set(tag.name.toLowerCase(), tag);
        }

        const addedTags = input.add.map((value) => tagsByIdentifier.get(value.toLowerCase()));
        const removedTags = input.remove.map((value) => tagsByIdentifier.get(value.toLowerCase()));

        if (account.serviceType === EmailServiceType.OFFICE365) {
            const addNames = input.add.map((value, index) => addedTags[index]?.name || value);
            const nextKeywords = uniqueStrings([...message.keywords, ...addNames]).filter(
                (keyword) =>
                    !input.remove.some((value) => {
                        const tag = tagsByIdentifier.get(value.toLowerCase());
                        return (
                            keyword.toLowerCase() === value.toLowerCase() ||
                            keyword.toLowerCase() === tag?.name.toLowerCase()
                        );
                    })
            );

            await AurinkoClient.updateGraphMessageCategories(
                accessToken,
                message.providerId,
                nextKeywords
            );

            await prisma.emailMessageCache.update({
                where: { id: message.id },
                data: { keywords: nextKeywords },
            });

            return { tagged: true, keywords: nextKeywords };
        }

        const addLabelIds = uniqueStrings(
            input.add.map((value, index) => addedTags[index]?.providerId || value)
        );
        const removeLabelIds = uniqueStrings(
            input.remove.map((value, index) => removedTags[index]?.providerId || value)
        );

        await AurinkoClient.updateGmailMessageLabels(accessToken, message.providerId, {
            addLabelIds,
            removeLabelIds,
        });

        const addNames = input.add.map((value, index) => addedTags[index]?.name || value);
        const removeNames = input.remove.map((value, index) => removedTags[index]?.name || value);
        const nextKeywords = uniqueStrings([...message.keywords, ...addNames]).filter(
            (keyword) =>
                !removeNames.some((name) => keyword.toLowerCase() === name.toLowerCase()) &&
                !removeLabelIds.some((id) => keyword.toLowerCase() === id.toLowerCase())
        );

        await prisma.emailMessageCache.update({
            where: { id: message.id },
            data: { keywords: nextKeywords },
        });

        return { tagged: true, keywords: nextKeywords };
    },

    async moveMessage(
        ctx: RequestContext,
        accountId: string,
        messageId: string,
        input: MoveMessageInput
    ) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const [message, folder] = await Promise.all([
            prisma.emailMessageCache.findFirst({
                where: { id: messageId, accountId, deletedAt: null },
            }),
            prisma.emailFolderCache.findFirst({
                where: { id: input.folderId, accountId },
            }),
        ]);

        if (!message) throw new NotFoundError('Email message not found');
        if (!folder) throw new NotFoundError('Email folder not found');

        const accessToken = decryptAccountToken(account);
        const movedMessage =
            account.serviceType === EmailServiceType.OFFICE365
                ? ((await AurinkoClient.moveGraphMessage(
                      accessToken,
                      message.providerId,
                      folder.providerId
                  )) as { id?: string })
                : ((await AurinkoClient.moveGmailMessage(
                      accessToken,
                      message.providerId,
                      folder.providerId
                  )) as { id?: string });

        await moveCachedMessage(account.id, message, folder.id, movedMessage.id);

        return { moved: true, folder: toFolderDto(folder) };
    },

    async getMessage(ctx: RequestContext, accountId: string, messageId: string) {
        await getAccountForOrg(accountId, ctx.organizationId);
        const message = await prisma.emailMessageCache.findFirst({
            where: { id: messageId, accountId, deletedAt: null },
            include: { attachments: true, folder: { select: { wellKnownKey: true } } },
        });
        if (!message) throw new NotFoundError('Email message not found');
        return toMessageDto(message);
    },

    async getConversation(ctx: RequestContext, accountId: string, threadId: string) {
        await getAccountForOrg(accountId, ctx.organizationId);
        const messages = await prisma.emailMessageCache.findMany({
            where: { accountId, threadId, deletedAt: null },
            include: { attachments: true, folder: { select: { wellKnownKey: true } } },
            orderBy: [{ sentAt: 'asc' }, { receivedAt: 'asc' }],
        });
        return messages.map((message) => toThreadMessageDto(message));
    },

    async sendMessage(ctx: RequestContext, accountId: string, input: SendMessageInput) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const accessToken = decryptAccountToken(account);
        const response = await AurinkoClient.sendMessage(accessToken, input.bodyType, {
            from: { address: account.mailboxAddress || account.email },
            subject: input.subject,
            body: input.body,
            to: input.to,
            cc: input.cc,
            bcc: input.bcc,
            attachments: input.attachments,
        });

        return response;
    },

    async replyMessage(
        ctx: RequestContext,
        accountId: string,
        messageId: string,
        input: ReplyMessageInput
    ) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const message = await prisma.emailMessageCache.findFirst({
            where: { id: messageId, accountId, deletedAt: null },
        });
        if (!message) throw new NotFoundError('Email message not found');

        const accessToken = decryptAccountToken(account);
        const to = buildReplyRecipients(account, message, input.to);
        if (to.length === 0) {
            throw new BadRequestError('Unable to determine reply recipient for this message');
        }

        const replyPayload: Record<string, unknown> = {
            from: { address: account.mailboxAddress || account.email },
            subject: withReplySubject(input.subject || message.subject),
            body: input.body,
            to,
        };

        if (input.cc?.length) replyPayload.cc = input.cc;
        if (input.bcc?.length) replyPayload.bcc = input.bcc;
        if (input.attachments?.length) replyPayload.attachments = input.attachments;

        const response = await AurinkoClient.replyMessage(
            accessToken,
            message.providerId,
            input.bodyType || 'html',
            replyPayload
        );

        return response;
    },

    async updateMessageStatus(
        ctx: RequestContext,
        accountId: string,
        messageId: string,
        input: UpdateMessageStatusInput
    ) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const message = await prisma.emailMessageCache.findFirst({
            where: { id: messageId, accountId, deletedAt: null },
        });
        if (!message) throw new NotFoundError('Email message not found');

        const response = await AurinkoClient.updateMessageStatus(
            decryptAccountToken(account),
            message.providerId,
            input
        );

        await prisma.emailMessageCache.update({
            where: { id: message.id },
            data: {
                unread: input.unread ?? message.unread,
                keywords: input.keywords ?? message.keywords,
            },
        });
        if (input.unread !== undefined && input.unread !== message.unread) {
            await refreshFolderCounts(account.id, [message.folderId]);
        }

        return response;
    },

    async archiveMessage(ctx: RequestContext, accountId: string, messageId: string) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const message = await prisma.emailMessageCache.findFirst({
            where: { id: messageId, accountId, deletedAt: null },
        });
        if (!message) throw new NotFoundError('Email message not found');

        const archiveFolder = await getWellKnownFolder(account, EmailFolderWellKnown.ARCHIVE);
        const accessToken = decryptAccountToken(account);
        const movedMessage =
            account.serviceType === EmailServiceType.OFFICE365
                ? ((await AurinkoClient.moveGraphMessage(
                      accessToken,
                      message.providerId,
                      archiveFolder.providerId
                  )) as { id?: string })
                : ((await AurinkoClient.updateGmailMessageLabels(accessToken, message.providerId, {
                      addLabelIds: [],
                      removeLabelIds: ['INBOX'],
                  })) as { id?: string });

        await moveCachedMessage(account.id, message, archiveFolder.id, movedMessage.id);

        return { archived: true, folder: toFolderDto(archiveFolder) };
    },

    async unarchiveMessage(ctx: RequestContext, accountId: string, messageId: string) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const message = await prisma.emailMessageCache.findFirst({
            where: { id: messageId, accountId, deletedAt: null },
        });
        if (!message) throw new NotFoundError('Email message not found');

        const inboxFolder = await getWellKnownFolder(account, EmailFolderWellKnown.INBOX);

        await AurinkoClient.updateMessageStatus(decryptAccountToken(account), message.providerId, {
            archived: false,
        });

        await moveCachedMessage(account.id, message, inboxFolder.id);

        return { archived: false, folder: toFolderDto(inboxFolder) };
    },

    async deleteMessage(ctx: RequestContext, accountId: string, messageId: string) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const message = await prisma.emailMessageCache.findFirst({
            where: { id: messageId, accountId, deletedAt: null },
        });
        if (!message) throw new NotFoundError('Email message not found');

        const deletedFolder = await getWellKnownFolder(account, EmailFolderWellKnown.DELETED);
        const accessToken = decryptAccountToken(account);
        const movedMessage =
            account.serviceType === EmailServiceType.OFFICE365
                ? ((await AurinkoClient.moveGraphMessage(
                      accessToken,
                      message.providerId,
                      deletedFolder.providerId
                  )) as { id?: string })
                : ((await AurinkoClient.trashGmailMessage(accessToken, message.providerId)) as {
                      id?: string;
                  });

        await moveCachedMessage(account.id, message, deletedFolder.id, movedMessage.id);

        return { deleted: true, folder: toFolderDto(deletedFolder) };
    },

    async getAttachment(
        ctx: RequestContext,
        accountId: string,
        messageId: string,
        attachmentId: string
    ) {
        const account = await getAccountForOrg(accountId, ctx.organizationId);
        const message = await prisma.emailMessageCache.findFirst({
            where: { id: messageId, accountId, deletedAt: null },
            include: { attachments: true },
        });
        if (!message) throw new NotFoundError('Email message not found');

        const attachment = message.attachments.find((item) => item.id === attachmentId);
        if (!attachment) throw new NotFoundError('Email attachment not found');

        const response = await AurinkoClient.getAttachment(
            decryptAccountToken(account),
            message.providerId,
            attachment.providerId
        );

        return {
            bytes: Buffer.from(response.content, 'base64'),
            fileName: attachment.name,
            contentType: attachment.mimeType || 'application/octet-stream',
        };
    },
};
