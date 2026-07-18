import {
    BadRequestError,
    ExternalServiceError,
    NotFoundError,
    TooManyRequestsError,
    UnauthorizedError,
} from '@utils';
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import z from 'zod';

const DEFAULT_AURINKO_BASE_URL = 'https://api.aurinko.io';
const MAIL_SCOPES = ['Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'Mail.Drafts'].join(' ');
const AURINKO_REQUEST_TIMEOUT_MS = 5_000;
const AURINKO_MAX_RETRY_ATTEMPTS = 1;
const AURINKO_RETRY_BASE_DELAY_MS = 250;

const TokenResponseSchema = z
    .object({
        accountId: z.union([z.number(), z.string()]),
        accessToken: z.string().min(1),
        userId: z.string().optional(),
        userSession: z.string().optional(),
    })
    .passthrough();

export type AurinkoTokenResponse = z.infer<typeof TokenResponseSchema>;

const AurinkoMessageSchema = z.object({ id: z.string().min(1) }).passthrough();
const AurinkoFolderSchema = z.object({ id: z.coerce.string().min(1) }).passthrough();
const AurinkoDeletedMessageSchema = z.object({ id: z.string().min(1) }).passthrough();
const AurinkoSyncStartSchema = z
    .object({
        syncUpdatedToken: z.string().min(1),
        syncDeletedToken: z.string().min(1),
        ready: z.boolean(),
    })
    .passthrough();

const aurinkoPageSchema = <T extends z.ZodTypeAny>(recordSchema: T) =>
    z
        .object({
            nextPageToken: z.string().optional(),
            nextDeltaToken: z.string().optional(),
            length: z.number().optional(),
            records: z.array(recordSchema).optional(),
        })
        .passthrough();

export type AurinkoServiceType = 'Google' | 'Office365';

export type AurinkoAccount = {
    id: number | string;
    serviceType?: string;
    serviceProvider?: string;
    active?: boolean;
    tokenStatus?: string;
    email?: string;
    email2?: string;
    mailboxAddress?: string;
    name?: string;
    name2?: string;
    scopes?: string[];
    [key: string]: unknown;
};

export type AurinkoFolder = {
    id: string;
    name?: string;
    displayName?: string;
    fullName?: string;
    isFolder?: boolean;
    isLabel?: boolean;
    parentId?: string;
    sysLabel?: string;
    [key: string]: unknown;
};

export type AurinkoEmailAddress = {
    name?: string;
    address?: string;
    raw?: string;
};

export type AurinkoAttachment = {
    id?: string;
    name?: string;
    mimeType?: string;
    size?: number;
    inline?: boolean;
    contentId?: string;
    [key: string]: unknown;
};

export type AurinkoMessage = {
    id: string;
    threadId?: string;
    createdTime?: string;
    lastModifiedTime?: string;
    sentAt?: string;
    receivedAt?: string;
    internetMessageId?: string;
    subject?: string;
    sysLabels?: string[];
    keywords?: string[];
    categories?: string[];
    from?: AurinkoEmailAddress;
    to?: AurinkoEmailAddress[];
    cc?: AurinkoEmailAddress[];
    bcc?: AurinkoEmailAddress[];
    replyTo?: AurinkoEmailAddress[];
    hasAttachments?: boolean;
    body?: string;
    bodySnippet?: string;
    attachments?: AurinkoAttachment[];
    folderId?: string;
    webLink?: string;
    [key: string]: unknown;
};

export type AurinkoGraphCategory = {
    id?: string;
    displayName: string;
    color?: string;
    [key: string]: unknown;
};

export type AurinkoGmailLabel = {
    id: string;
    name: string;
    type?: 'system' | 'user' | string;
    [key: string]: unknown;
};

export type AurinkoPage<T> = {
    nextPageToken?: string;
    nextDeltaToken?: string;
    length?: number;
    records?: T[];
};

export type AurinkoSyncStart = {
    syncUpdatedToken: string;
    syncDeletedToken: string;
    ready: boolean;
};

export type AurinkoSendResponse = {
    status?: string;
    id?: string;
    submittedMessageId?: string;
    threadId?: string;
    [key: string]: unknown;
};

export type AurinkoSubscription = {
    id: number | string;
    resource?: string;
    notificationUrl?: string;
    active?: boolean;
    failSince?: string;
    failDescription?: string;
    [key: string]: unknown;
};

const getBaseUrl = () =>
    (process.env.AURINKO_BASE_URL || DEFAULT_AURINKO_BASE_URL).replace(/\/+$/, '');

const getClientId = () => {
    const value = process.env.AURINKO_CLIENT_ID?.trim();
    if (!value) throw new BadRequestError('Aurinko client id is not configured');
    return value;
};

const getClientSecret = () => {
    const value = process.env.AURINKO_CLIENT_SECRET?.trim();
    if (!value) throw new BadRequestError('Aurinko client secret is not configured');
    return value;
};

const getRedirectUri = () => {
    const value = process.env.AURINKO_REDIRECT_URI?.trim();
    if (!value) throw new BadRequestError('Aurinko redirect uri is not configured');
    return value;
};

type AurinkoErrorBody = {
    message?: string;
    error?: string;
    code?: string;
    requestId?: string;
};

const getErrorBody = (error: AxiosError): AurinkoErrorBody | undefined => {
    if (!error.response?.data || typeof error.response.data !== 'object') return undefined;
    return error.response.data as AurinkoErrorBody;
};

const getRetryAfterSeconds = (error: AxiosError): number | undefined => {
    const value = error.response?.headers?.['retry-after'];
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.ceil(value));
    if (typeof value !== 'string') return undefined;

    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(1, Math.ceil(seconds));

    const retryAt = new Date(value).getTime();
    if (Number.isNaN(retryAt)) return undefined;
    return Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
};

const getSafeMessage = (error: AxiosError): string => {
    const data = getErrorBody(error);
    return data?.message || data?.error || data?.code || error.message || 'Unknown provider error';
};

const isRetryableError = (error: AxiosError): boolean => {
    const code = error.code?.toUpperCase();
    if (code === 'ECONNREFUSED' || code === 'CONNECTIONREFUSED') return false;

    const status = error.response?.status;
    return !status || status === 408 || status === 429 || status >= 500;
};

const delay = (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const getRetryDelayMs = (error: AxiosError, attempt: number): number => {
    const retryAfterSeconds = getRetryAfterSeconds(error);
    if (retryAfterSeconds) return Math.min(retryAfterSeconds * 1000, 10_000);
    const exponential = AURINKO_RETRY_BASE_DELAY_MS * 2 ** attempt;
    return exponential + Math.floor(Math.random() * AURINKO_RETRY_BASE_DELAY_MS);
};

const mapError = (error: unknown): never => {
    if (!axios.isAxiosError(error)) throw error;

    const status = error.response?.status;
    const data = getErrorBody(error);
    const message = getSafeMessage(error);

    if (status === 401 || status === 403)
        throw new UnauthorizedError(
            'The email provider authorization is no longer valid. Reconnect the account.',
            'EMAIL_RECONNECT_REQUIRED'
        );
    if (status === 429)
        throw new TooManyRequestsError(
            'The email provider is temporarily rate limited. Try again shortly.',
            getRetryAfterSeconds(error)
        );
    if (status === 404) throw new NotFoundError('The email provider resource was not found.');
    if (status === 410)
        throw new ExternalServiceError('The email sync cursor expired and must be restarted.', {
            code: 'EMAIL_SYNC_CURSOR_EXPIRED',
            status: 503,
            upstreamStatus: 410,
            requestId: data?.requestId,
        });
    if (status === 400 || status === 412)
        throw new BadRequestError(`Email provider rejected the request: ${message}`);
    if (
        status === 408 ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ERR_CANCELED' ||
        error.name === 'AbortError'
    ) {
        throw new ExternalServiceError('The email provider took too long to respond.', {
            code: 'EMAIL_PROVIDER_TIMEOUT',
            status: 504,
            upstreamStatus: status,
            requestId: data?.requestId,
        });
    }
    throw new ExternalServiceError('The email provider is temporarily unavailable.', {
        code: status && status >= 500 ? 'EMAIL_PROVIDER_UNAVAILABLE' : 'EMAIL_PROVIDER_CONNECTION',
        status: 503,
        upstreamStatus: status,
        requestId: data?.requestId,
    });
};

const appAuth = () => ({
    username: getClientId(),
    password: getClientSecret(),
});

const request = async <T>(
    config: AxiosRequestConfig,
    options: { retryable?: boolean } = {}
): Promise<T> => {
    const retryable =
        options.retryable ?? ['GET', 'HEAD'].includes(config.method?.toUpperCase() || 'GET');
    const startedAt = performance.now();

    for (let attempt = 0; ; attempt += 1) {
        const attemptStartedAt = performance.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), AURINKO_REQUEST_TIMEOUT_MS);

        try {
            const response = await axios.request<T>({
                ...config,
                baseURL: getBaseUrl(),
                timeout: AURINKO_REQUEST_TIMEOUT_MS,
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (process.env.NODE_ENV === 'development') {
                console.info('[email] Aurinko request completed', {
                    operation: `${config.method || 'GET'} ${config.url || ''}`,
                    attempt: attempt + 1,
                    durationMs: Math.round(performance.now() - attemptStartedAt),
                    totalDurationMs: Math.round(performance.now() - startedAt),
                    status: response.status,
                });
            }
            return response.data;
        } catch (error) {
            clearTimeout(timeout);
            const axiosError = error as AxiosError;
            const retrying =
                retryable &&
                axios.isAxiosError(axiosError) &&
                isRetryableError(axiosError) &&
                attempt < AURINKO_MAX_RETRY_ATTEMPTS;
            console.warn('[email] Aurinko request failed', {
                operation: `${config.method || 'GET'} ${config.url || ''}`,
                attempt: attempt + 1,
                durationMs: Math.round(performance.now() - attemptStartedAt),
                totalDurationMs: Math.round(performance.now() - startedAt),
                upstreamStatus: axiosError.response?.status,
                code: axiosError.code,
                retrying,
            });
            if (retrying) {
                await delay(getRetryDelayMs(axiosError, attempt));
                continue;
            }
            return mapError(error);
        }
    }
};

const accountRequest = async <T>(accessToken: string, config: AxiosRequestConfig): Promise<T> => {
    return request<T>({
        ...config,
        headers: {
            ...config.headers,
            Authorization: `Bearer ${accessToken}`,
        },
    });
};

const directRequest = async <T>(accessToken: string, path: string, config: AxiosRequestConfig) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return accountRequest<T>(accessToken, {
        ...config,
        url: `/v1/direct${normalizedPath}`,
    });
};

export const AurinkoClient = {
    getRedirectUri,

    createAuthorizationUrl(input: {
        serviceType: AurinkoServiceType;
        state: string;
        clientOrgId: string;
        loginHint?: string;
    }): string {
        const url = new URL('/v1/auth/authorize', getBaseUrl());
        url.searchParams.set('clientId', getClientId());
        url.searchParams.set('serviceType', input.serviceType);
        url.searchParams.set('scopes', MAIL_SCOPES);
        url.searchParams.set('responseType', 'code');
        url.searchParams.set('returnUrl', getRedirectUri());
        url.searchParams.set('state', input.state);
        url.searchParams.set('clientOrgId', input.clientOrgId);
        url.searchParams.set('ensureScopes', 'true');
        url.searchParams.set('ensureAccess', 'true');
        url.searchParams.set('recycle', 'true');
        if (input.loginHint) url.searchParams.set('loginHint', input.loginHint);
        return url.toString();
    },

    async exchangeCode(code: string): Promise<AurinkoTokenResponse> {
        const data = await request<unknown>({
            method: 'POST',
            url: `/v1/auth/token/${encodeURIComponent(code)}`,
            auth: appAuth(),
        });
        return TokenResponseSchema.parse(data);
    },

    getAccount(accessToken: string): Promise<AurinkoAccount> {
        return accountRequest<AurinkoAccount>(accessToken, {
            method: 'GET',
            url: '/v1/account',
            params: { pingProvider: true },
        });
    },

    deleteAccount(accessToken: string): Promise<unknown> {
        return accountRequest(accessToken, { method: 'DELETE', url: '/v1/account' });
    },

    async listFolders(accessToken: string): Promise<AurinkoPage<AurinkoFolder>> {
        const data = await accountRequest<unknown>(accessToken, {
            method: 'GET',
            url: '/v1/email/folders',
        });
        return aurinkoPageSchema(AurinkoFolderSchema).parse(data) as AurinkoPage<AurinkoFolder>;
    },

    getWellKnownFolders(accessToken: string): Promise<Record<string, string>> {
        return accountRequest<Record<string, string>>(accessToken, {
            method: 'GET',
            url: '/v1/email/folders/wellKnown',
        });
    },

    async listMessages(
        accessToken: string,
        input: { folderId?: string; pageToken?: string; q?: string; limit?: number }
    ): Promise<AurinkoPage<AurinkoMessage>> {
        const data = await accountRequest<unknown>(accessToken, {
            method: 'GET',
            url: input.folderId
                ? `/v1/email/folders/${encodeURIComponent(input.folderId)}/messages`
                : '/v1/email/messages',
            params: {
                bodyType: 'html',
                pageToken: input.pageToken,
                q: input.q,
                limit: input.limit,
            },
        });
        return aurinkoPageSchema(AurinkoMessageSchema).parse(data) as AurinkoPage<AurinkoMessage>;
    },

    async getMessage(accessToken: string, messageId: string): Promise<AurinkoMessage> {
        const data = await accountRequest<unknown>(accessToken, {
            method: 'GET',
            url: `/v1/email/messages/${encodeURIComponent(messageId)}`,
            params: { bodyType: 'html', loadInlines: false },
        });
        return AurinkoMessageSchema.parse(data) as AurinkoMessage;
    },

    async getConversation(
        accessToken: string,
        threadId: string,
        pageToken?: string
    ): Promise<AurinkoPage<AurinkoMessage>> {
        const data = await accountRequest<unknown>(accessToken, {
            method: 'GET',
            url: `/v1/email/conversations/${encodeURIComponent(threadId)}`,
            params: { bodyType: 'html', pageToken },
        });
        return aurinkoPageSchema(AurinkoMessageSchema).parse(data) as AurinkoPage<AurinkoMessage>;
    },

    async startEmailSync(accessToken: string, daysWithin: number): Promise<AurinkoSyncStart> {
        const data = await accountRequest<unknown>(accessToken, {
            method: 'POST',
            url: '/v1/email/sync',
            params: { daysWithin, bodyType: 'html' },
        });
        return AurinkoSyncStartSchema.parse(data);
    },

    async getUpdatedEmails(
        accessToken: string,
        input: { deltaToken?: string | null; pageToken?: string | null }
    ): Promise<AurinkoPage<AurinkoMessage>> {
        const data = await accountRequest<unknown>(accessToken, {
            method: 'GET',
            url: '/v1/email/sync/updated',
            params: input,
        });
        return aurinkoPageSchema(AurinkoMessageSchema).parse(data) as AurinkoPage<AurinkoMessage>;
    },

    async getDeletedEmails(
        accessToken: string,
        input: { deltaToken?: string | null; pageToken?: string | null }
    ): Promise<AurinkoPage<{ id: string }>> {
        const data = await accountRequest<unknown>(accessToken, {
            method: 'GET',
            url: '/v1/email/sync/deleted',
            params: input,
        });
        return aurinkoPageSchema(AurinkoDeletedMessageSchema).parse(data) as AurinkoPage<{
            id: string;
        }>;
    },

    sendMessage(accessToken: string, bodyType: 'html' | 'text', data: unknown) {
        return accountRequest<AurinkoSendResponse>(accessToken, {
            method: 'POST',
            url: '/v1/email/messages',
            params: { bodyType, returnIds: true },
            data,
        });
    },

    replyMessage(accessToken: string, messageId: string, bodyType: 'html' | 'text', data: unknown) {
        return accountRequest<AurinkoSendResponse>(accessToken, {
            method: 'POST',
            url: `/v1/email/messages/${encodeURIComponent(messageId)}/reply`,
            params: { bodyType, returnIds: true },
            data,
        });
    },

    updateMessageStatus(accessToken: string, messageId: string, data: unknown) {
        return accountRequest(accessToken, {
            method: 'POST',
            url: `/v1/email/messages/${encodeURIComponent(messageId)}/status`,
            data,
        });
    },

    deleteMessage(accessToken: string, messageId: string) {
        return accountRequest(accessToken, {
            method: 'DELETE',
            url: `/v1/email/messages/${encodeURIComponent(messageId)}`,
        });
    },

    createFolder(accessToken: string, data: { name: string; parentId?: string }) {
        return accountRequest<AurinkoFolder>(accessToken, {
            method: 'POST',
            url: '/v1/email/folders',
            data,
        });
    },

    createGraphFolder(accessToken: string, data: { name: string }) {
        return directRequest<AurinkoFolder>(accessToken, '/me/mailFolders', {
            method: 'POST',
            data: { displayName: data.name },
        });
    },

    createGmailLabel(accessToken: string, data: { name: string }) {
        return directRequest<AurinkoFolder & AurinkoGmailLabel>(
            accessToken,
            '/gmail/v1/users/me/labels',
            {
                method: 'POST',
                data: {
                    name: data.name,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show',
                },
            }
        );
    },

    listGraphCategories(accessToken: string) {
        return directRequest<{ value?: AurinkoGraphCategory[] }>(
            accessToken,
            '/me/outlook/masterCategories',
            {
                method: 'GET',
            }
        );
    },

    createGraphCategory(accessToken: string, data: { name: string; color?: string }) {
        return directRequest<AurinkoGraphCategory>(accessToken, '/me/outlook/masterCategories', {
            method: 'POST',
            data: {
                displayName: data.name,
                color: data.color || 'preset0',
            },
        });
    },

    listGmailLabels(accessToken: string) {
        return directRequest<{ labels?: AurinkoGmailLabel[] }>(
            accessToken,
            '/gmail/v1/users/me/labels',
            {
                method: 'GET',
            }
        );
    },

    updateGraphMessageCategories(accessToken: string, messageId: string, categories: string[]) {
        return directRequest(accessToken, `/me/messages/${encodeURIComponent(messageId)}`, {
            method: 'PATCH',
            data: { categories },
        });
    },

    updateGmailMessageLabels(
        accessToken: string,
        messageId: string,
        data: { addLabelIds: string[]; removeLabelIds: string[] }
    ) {
        return directRequest(
            accessToken,
            `/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/modify`,
            {
                method: 'POST',
                data,
            }
        );
    },

    trashGmailMessage(accessToken: string, messageId: string) {
        return directRequest(
            accessToken,
            `/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/trash`,
            {
                method: 'POST',
            }
        );
    },

    moveGraphMessage(accessToken: string, messageId: string, folderId: string) {
        return directRequest(accessToken, `/me/messages/${encodeURIComponent(messageId)}/move`, {
            method: 'POST',
            data: { destinationId: folderId },
        });
    },

    moveGmailMessage(accessToken: string, messageId: string, labelId: string) {
        return this.updateGmailMessageLabels(accessToken, messageId, {
            addLabelIds: [labelId],
            removeLabelIds: ['INBOX'],
        });
    },

    moveMessage(accessToken: string, messageId: string, folderId: string) {
        return accountRequest(accessToken, {
            method: 'POST',
            url: `/v1/email/messages/${encodeURIComponent(messageId)}/status`,
            data: { folderId },
        });
    },

    getAttachment(accessToken: string, messageId: string, attachmentId: string) {
        return accountRequest<{ content: string }>(accessToken, {
            method: 'GET',
            url: `/v1/email/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
        });
    },

    createSubscription(accessToken: string, notificationUrl: string) {
        return accountRequest<AurinkoSubscription>(accessToken, {
            method: 'POST',
            url: '/v1/subscriptions',
            data: {
                resource: '/email/messages',
                notificationUrl,
                filters: ['withoutDrafts'],
                detailLevel: 'signal',
            },
        });
    },
};

export const aurinkoClientInternals = {
    getRetryAfterSeconds,
    isRetryableError,
    mapError,
};
