import 'dotenv/config';

const NOTION_BASE_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11';
const LEGACY_DATABASE_VERSION = '2022-06-28';
const DEFAULT_DATABASE_ID = '38210733-75a7-8019-a93f-ef44bafe6453';

const TITLE_PROPERTY = 'Name';
const STATUS_PROPERTY = 'Status';
const FEEDBACK_STATUS = 'Feedback';
const CLARIFICATION_STATUS = 'Needs clarification';

type SmokeAttachment = {
    filename: string;
    contentType: string;
    content: Uint8Array;
};

function cleanEnv(value: string | undefined): string | undefined {
    return value?.trim().replace(/^['"]|['"]$/g, '') || undefined;
}

function formatId(id: string): string {
    const compact = id.replace(/-/g, '');
    if (compact.length !== 32) return id;

    return compact.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

const token = cleanEnv(process.env.NOTION_ACCESS_TOKEN);
const databaseId = formatId(
    cleanEnv(process.env.NOTION_FEEDBACK_DATABASE_ID) || DEFAULT_DATABASE_ID
);

if (!token) {
    throw new Error('Missing NOTION_ACCESS_TOKEN in elli-core/.env');
}

function jsonHeaders(version = NOTION_VERSION): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': version,
    };
}

function authHeaders(version = NOTION_VERSION): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Notion-Version': version,
    };
}

async function notionJson<T>(
    path: string,
    init: RequestInit = {},
    version = NOTION_VERSION
): Promise<T> {
    const isForm = init.body instanceof FormData;
    const response = await fetch(`${NOTION_BASE_URL}${path}`, {
        ...init,
        headers: {
            ...(isForm ? authHeaders(version) : jsonHeaders(version)),
            ...init.headers,
        },
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
        const code = body?.code ? ` ${body.code}` : '';
        const message = body?.message ? `: ${body.message}` : '';
        throw new Error(
            `Notion ${init.method || 'GET'} ${path} failed (${response.status}${code})${message}`
        );
    }

    return body as T;
}

function text(content: string) {
    return { type: 'text', text: { content } };
}

function paragraph(content: string) {
    return {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [text(content)] },
    };
}

async function uploadAttachment(attachment: SmokeAttachment): Promise<string> {
    const created = await notionJson<{ id: string }>('/file_uploads', {
        method: 'POST',
        body: JSON.stringify({
            mode: 'single_part',
            filename: attachment.filename,
            content_type: attachment.contentType,
        }),
    });
    const formData = new FormData();
    formData.append(
        'file',
        new Blob([attachment.content.buffer as ArrayBuffer], { type: attachment.contentType }),
        attachment.filename
    );
    const uploaded = await notionJson<{ id: string; status: string }>(
        `/file_uploads/${created.id}/send`,
        { method: 'POST', body: formData }
    );

    if (uploaded.status !== 'uploaded') {
        throw new Error(`File upload ${uploaded.id} ended with status ${uploaded.status}`);
    }

    return uploaded.id;
}

async function createFeedback(input: {
    title: string;
    message: string;
    attachment: SmokeAttachment;
}): Promise<{ id: string; url: string }> {
    const fileUploadId = await uploadAttachment(input.attachment);

    return notionJson<{ id: string; url: string }>(
        '/pages',
        {
            method: 'POST',
            body: JSON.stringify({
                parent: { type: 'database_id', database_id: databaseId },
                properties: {
                    [TITLE_PROPERTY]: { title: [text(input.title)] },
                    [STATUS_PROPERTY]: { status: { name: FEEDBACK_STATUS } },
                },
                children: [
                    paragraph(input.message),
                    {
                        object: 'block',
                        type: 'file',
                        file: {
                            type: 'file_upload',
                            file_upload: { id: fileUploadId },
                            caption: [text(input.attachment.filename)],
                        },
                    },
                ],
            }),
        },
        LEGACY_DATABASE_VERSION
    );
}

async function updateFeedbackToClarification(pageId: string): Promise<void> {
    await notionJson(
        `/pages/${pageId}`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                properties: {
                    [STATUS_PROPERTY]: { status: { name: CLARIFICATION_STATUS } },
                },
            }),
        },
        LEGACY_DATABASE_VERSION
    );
}

async function main() {
    console.log('Notion feedback smoke test');
    console.log(`Database: ${databaseId}`);

    const me = await notionJson<{ name?: string; bot?: { workspace_name?: string } }>(
        '/users/me',
        undefined,
        LEGACY_DATABASE_VERSION
    );
    console.log(`Bot: ${me.name || 'unknown'} (${me.bot?.workspace_name || 'unknown workspace'})`);

    await notionJson(`/databases/${databaseId}`, undefined, LEGACY_DATABASE_VERSION);

    const runId = new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, '')
        .slice(0, 14);
    const feedbackA = await createFeedback({
        title: `Smoke feedback A ${runId}`,
        message: 'Smoke test feedback A from elli-core.',
        attachment: {
            filename: `smoke-feedback-a-${runId}.txt`,
            contentType: 'text/plain',
            content: new TextEncoder().encode(`Smoke feedback A attachment ${runId}\n`),
        },
    });
    console.log(`Created feedback A: ${feedbackA.id} ${feedbackA.url}`);

    const feedbackB = await createFeedback({
        title: `Smoke feedback B ${runId}`,
        message: 'Smoke test feedback B from elli-core.',
        attachment: {
            filename: `smoke-feedback-b-${runId}.svg`,
            contentType: 'image/svg+xml',
            content: new TextEncoder().encode(
                `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="320" height="120" fill="#f5f5f5"/><text x="20" y="65" font-family="Arial" font-size="18" fill="#111">ElliHub smoke ${runId}</text></svg>`
            ),
        },
    });
    console.log(`Created feedback B: ${feedbackB.id} ${feedbackB.url}`);

    await updateFeedbackToClarification(feedbackB.id);
    console.log(`Updated feedback B to ${CLARIFICATION_STATUS}: ${feedbackB.id}`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
