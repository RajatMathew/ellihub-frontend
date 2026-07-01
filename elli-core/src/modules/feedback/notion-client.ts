import { BadRequestError, InternalServerError, TooManyRequestsError } from '@utils';

type NotionRequestOptions = {
    method?: string;
    body?: BodyInit | string;
    version?: string;
    headers?: HeadersInit;
};

type NotionFileUpload = {
    id: string;
    status: 'pending' | 'uploaded' | 'expired' | 'failed';
};

export type NotionPage = {
    id: string;
    url?: string;
    created_time?: string;
    last_edited_time?: string;
    properties?: Record<string, unknown>;
};

export type NotionBlockResponse = {
    id: string;
    type: string;
    has_children?: boolean;
    [key: string]: unknown;
};

type NotionListResponse<T> = {
    results: T[];
    has_more?: boolean;
    next_cursor?: string | null;
};

export type NotionPropertySchema = {
    type?: string;
    status?: { options?: Array<{ name?: string }> };
    select?: { options?: Array<{ name?: string }> };
};

export type NotionTargetSchema = {
    properties?: Record<string, NotionPropertySchema>;
};

export type NotionParent =
    | { type: 'data_source_id'; data_source_id: string }
    | { type: 'database_id'; database_id: string };

export type NotionRichText = {
    type: 'text';
    text: { content: string };
};

export type NotionBlock =
    | {
          object: 'block';
          type: 'paragraph';
          paragraph: { rich_text: NotionRichText[] };
      }
    | {
          object: 'block';
          type: 'heading_2';
          heading_2: { rich_text: NotionRichText[] };
      }
    | {
          object: 'block';
          type: 'file';
          file: {
              type: 'file_upload';
              file_upload: { id: string };
              caption?: NotionRichText[];
          };
      };

export type NotionPageCreateRequest = {
    parent: NotionParent;
    properties: Record<string, unknown>;
    children: NotionBlock[];
};

const NOTION_BASE_URL = 'https://api.notion.com/v1';
const DEFAULT_NOTION_VERSION = '2026-03-11';
const LEGACY_DATABASE_VERSION = '2022-06-28';
const SAFE_DESTINATION_ERROR = 'Feedback destination is not available.';
const MAX_REQUEST_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

function cleanEnv(value: string | undefined): string | undefined {
    return value?.trim().replace(/^['"]|['"]$/g, '') || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getErrorMessage(body: unknown): string | undefined {
    if (!isRecord(body)) return undefined;

    const message = body.message;
    return typeof message === 'string' ? message : undefined;
}

function getErrorCode(body: unknown): string | undefined {
    if (!isRecord(body)) return undefined;

    const code = body.code;
    return typeof code === 'string' ? code : undefined;
}

async function parseJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return { message: text };
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(response: Response): number | undefined {
    const retryAfter = response.headers.get('retry-after');
    if (!retryAfter) return undefined;

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return seconds * 1000;
    }

    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) {
        return Math.max(0, dateMs - Date.now());
    }

    return undefined;
}

function getRetryDelayMs(attempt: number, response?: Response): number {
    return (response ? getRetryAfterMs(response) : undefined) ?? RETRY_BASE_DELAY_MS * 2 ** attempt;
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

export class NotionClient {
    private readonly token: string;
    private readonly version: string;

    constructor(token: string, version = DEFAULT_NOTION_VERSION) {
        this.token = token;
        this.version = version;
    }

    static fromEnv(): NotionClient {
        const token = cleanEnv(process.env.NOTION_ACCESS_TOKEN);

        if (!token) {
            throw new InternalServerError('Feedback is not configured.');
        }

        return new NotionClient(token);
    }

    get legacyDatabaseVersion(): string {
        return LEGACY_DATABASE_VERSION;
    }

    async createFileUpload(input: {
        filename: string;
        contentType?: string;
        mode?: 'single_part' | 'multi_part';
        numberOfParts?: number;
    }): Promise<NotionFileUpload> {
        return this.request<NotionFileUpload>('/file_uploads', {
            method: 'POST',
            body: JSON.stringify({
                mode: input.mode || 'single_part',
                filename: input.filename,
                ...(input.contentType ? { content_type: input.contentType } : {}),
                ...(input.numberOfParts ? { number_of_parts: input.numberOfParts } : {}),
            }),
        });
    }

    async sendFileUpload(input: {
        fileUploadId: string;
        file: Blob;
        filename: string;
        partNumber?: number;
    }): Promise<NotionFileUpload> {
        const formData = new FormData();
        formData.append('file', input.file, input.filename);
        if (typeof input.partNumber === 'number') {
            formData.append('part_number', String(input.partNumber));
        }

        return this.request<NotionFileUpload>(`/file_uploads/${input.fileUploadId}/send`, {
            method: 'POST',
            body: formData,
        });
    }

    async completeFileUpload(fileUploadId: string): Promise<NotionFileUpload> {
        return this.request<NotionFileUpload>(`/file_uploads/${fileUploadId}/complete`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    async retrieveFileUpload(fileUploadId: string): Promise<NotionFileUpload> {
        return this.request<NotionFileUpload>(`/file_uploads/${fileUploadId}`);
    }

    async createPage(input: NotionPageCreateRequest, version?: string): Promise<NotionPage> {
        return this.request<NotionPage>(
            '/pages',
            {
                method: 'POST',
                body: JSON.stringify(input),
            },
            version
        );
    }

    async queryDatabase(
        databaseId: string,
        input: Record<string, unknown> = {}
    ): Promise<NotionListResponse<NotionPage>> {
        return this.request<NotionListResponse<NotionPage>>(
            `/databases/${databaseId}/query`,
            {
                method: 'POST',
                body: JSON.stringify(input),
            },
            LEGACY_DATABASE_VERSION
        );
    }

    async retrieveDatabase(databaseId: string): Promise<NotionTargetSchema> {
        return this.request<NotionTargetSchema>(
            `/databases/${databaseId}`,
            {},
            LEGACY_DATABASE_VERSION
        );
    }

    async retrievePage(pageId: string): Promise<NotionPage> {
        return this.request<NotionPage>(`/pages/${pageId}`, {}, LEGACY_DATABASE_VERSION);
    }

    async listBlockChildren(
        blockId: string,
        cursor?: string
    ): Promise<NotionListResponse<NotionBlockResponse>> {
        const search = new URLSearchParams({ page_size: '100' });
        if (cursor) {
            search.set('start_cursor', cursor);
        }

        return this.request<NotionListResponse<NotionBlockResponse>>(
            `/blocks/${blockId}/children?${search.toString()}`
        );
    }

    async queryDataSource(
        dataSourceId: string,
        input: Record<string, unknown> = {}
    ): Promise<NotionListResponse<NotionPage>> {
        return this.request<NotionListResponse<NotionPage>>(`/data_sources/${dataSourceId}/query`, {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }

    async retrieveDataSource(dataSourceId: string): Promise<NotionTargetSchema> {
        return this.request<NotionTargetSchema>(`/data_sources/${dataSourceId}`);
    }

    private async request<T>(
        path: string,
        options: NotionRequestOptions = {},
        version = options.version || this.version
    ): Promise<T> {
        const isForm = options.body instanceof FormData;
        const headers: HeadersInit = {
            Authorization: `Bearer ${this.token}`,
            'Notion-Version': version,
            ...(isForm ? {} : { 'Content-Type': 'application/json' }),
            ...options.headers,
        };

        for (let attempt = 0; attempt < MAX_REQUEST_ATTEMPTS; attempt += 1) {
            try {
                const response = await fetch(`${NOTION_BASE_URL}${path}`, {
                    method: options.method || 'GET',
                    body: options.body,
                    headers,
                });
                const body = await parseJson(response);

                if (response.ok) {
                    return body as T;
                }

                if (attempt < MAX_REQUEST_ATTEMPTS - 1 && isRetryableStatus(response.status)) {
                    await sleep(getRetryDelayMs(attempt, response));
                    continue;
                }

                this.handleError(path, response.status, body);
            } catch (error) {
                if (
                    error instanceof BadRequestError ||
                    error instanceof InternalServerError ||
                    error instanceof TooManyRequestsError
                ) {
                    throw error;
                }

                if (attempt < MAX_REQUEST_ATTEMPTS - 1) {
                    await sleep(getRetryDelayMs(attempt));
                    continue;
                }

                console.error('Notion feedback request failed', {
                    path,
                    message: error instanceof Error ? error.message : String(error),
                });
                throw new InternalServerError('Failed to send feedback.');
            }
        }

        throw new InternalServerError('Failed to send feedback.');
    }

    private handleError(path: string, status: number, body: unknown): never {
        const code = getErrorCode(body);
        const message = getErrorMessage(body);

        console.error('Notion feedback request failed', {
            path,
            status,
            code,
            message,
        });

        if (status === 429) {
            throw new TooManyRequestsError('Feedback destination is busy. Please try again.');
        }

        if (status === 400 && code === 'validation_error') {
            throw new BadRequestError(message || 'Notion rejected this attachment.');
        }

        if ([401, 403, 404].includes(status)) {
            throw new InternalServerError(SAFE_DESTINATION_ERROR);
        }

        throw new InternalServerError('Failed to send feedback.');
    }
}
