import { BadRequestError, InternalServerError } from '@utils';

import {
    FEEDBACK_MAX_FILE_BYTES,
    FEEDBACK_MAX_FILES,
    FeedbackBoardColumn,
    FeedbackDetailAttachment,
    FeedbackDetailContentBlock,
    FeedbackDetailResult,
    FeedbackBoardItem,
    FeedbackBoardResult,
    FeedbackAttachment,
    FeedbackSubmitRequest,
    FeedbackSubmitResult,
} from './models';
import {
    NotionBlock,
    NotionBlockResponse,
    NotionClient,
    NotionPage,
    NotionPropertySchema,
    NotionTargetSchema,
    NotionRichText,
} from './notion-client';

type NotionTargetConfig = {
    id: string;
};

const TITLE_PROPERTY = 'Name';
const STATUS_PROPERTY = 'Status';
const FEEDBACK_STATUS = 'Feedback';
const NOTION_SINGLE_PART_MAX_FILE_BYTES = 20 * 1024 * 1024;
const NOTION_MULTI_PART_CHUNK_BYTES = 20 * 1024 * 1024;
const FEEDBACK_DETAIL_TEXT_BLOCK_TYPES = new Set([
    'bulleted_list_item',
    'callout',
    'heading_1',
    'heading_2',
    'heading_3',
    'numbered_list_item',
    'paragraph',
    'quote',
    'to_do',
    'toggle',
]);
const FEEDBACK_DETAIL_ATTACHMENT_BLOCK_TYPES = new Set(['audio', 'file', 'image', 'pdf', 'video']);
const BLOCKED_EXTENSIONS = new Set([
    'app',
    'bat',
    'cmd',
    'com',
    'dmg',
    'exe',
    'js',
    'jse',
    'msi',
    'ps1',
    'scr',
    'sh',
    'vbs',
]);

function cleanEnv(value: string | undefined): string | undefined {
    return value?.trim().replace(/^['"]|['"]$/g, '') || undefined;
}

function hasControlCharacter(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const charCode = value.charCodeAt(index);
        if (charCode <= 0x1f || charCode === 0x7f) return true;
    }

    return false;
}

function getBlockedExtensionFromName(fileName: string): string | undefined {
    return fileName
        .toLowerCase()
        .split('.')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .find((segment) => BLOCKED_EXTENSIONS.has(segment));
}

function getAttachmentContentType(attachment: FeedbackAttachment): string | undefined {
    const contentType = attachment.type?.trim();
    return contentType || undefined;
}

function deriveTitle(title: string | undefined, message: string): string {
    const candidate = title?.trim() || message.split('\n')[0]?.trim() || 'Feedback';

    return candidate.length > 120 ? `${candidate.slice(0, 117)}...` : candidate;
}

function text(content: string): NotionRichText {
    return { type: 'text', text: { content } };
}

function paragraph(content: string): NotionBlock {
    return {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [text(content)] },
    };
}

function buildAddedByFooter(input: FeedbackSubmitRequest): string | undefined {
    const values = [input.submittedBy.name?.trim(), input.submittedBy.email?.trim()].filter(
        (value): value is string => Boolean(value)
    );

    if (values.length === 0) {
        return undefined;
    }

    return ['Added by:', ...values].join('\n');
}

function getTargetConfig(): NotionTargetConfig {
    const databaseId = cleanEnv(process.env.NOTION_FEEDBACK_DATABASE_ID);

    if (!databaseId) {
        throw new InternalServerError('Feedback is not configured.');
    }

    return { id: databaseId };
}

function validateAttachment(attachment: FeedbackAttachment) {
    const fileName = attachment.name.trim();

    if (!fileName) {
        throw new BadRequestError('Attachment name is required.');
    }

    if (fileName === '.' || fileName === '..') {
        throw new BadRequestError(`${attachment.name} has an invalid file name.`);
    }

    if (hasControlCharacter(fileName)) {
        throw new BadRequestError(`${attachment.name} contains invalid characters.`);
    }

    if (/[\\/]/u.test(fileName)) {
        throw new BadRequestError(`${attachment.name} cannot contain path separators.`);
    }

    if (attachment.size <= 0) {
        throw new BadRequestError(`${attachment.name} is empty.`);
    }

    if (attachment.size > FEEDBACK_MAX_FILE_BYTES) {
        throw new BadRequestError(`${attachment.name} must be 5 GB or smaller.`);
    }

    const extension = getBlockedExtensionFromName(fileName);
    if (extension) {
        throw new BadRequestError(`${attachment.name} is not an allowed file type.`);
    }
}

function validateAttachments(files: FeedbackAttachment[]) {
    if (files.length > FEEDBACK_MAX_FILES) {
        throw new BadRequestError(`You can attach up to ${FEEDBACK_MAX_FILES} files.`);
    }

    files.forEach(validateAttachment);
}

function buildChildren(
    input: FeedbackSubmitRequest,
    uploadedFiles: Array<{ id: string; name: string }>
): NotionBlock[] {
    const blocks: NotionBlock[] = [paragraph(input.message)];
    const addedByFooter = buildAddedByFooter(input);

    uploadedFiles.forEach((file) => {
        blocks.push({
            object: 'block',
            type: 'file',
            file: {
                type: 'file_upload',
                file_upload: { id: file.id },
                caption: [text(file.name)],
            },
        });
    });

    if (addedByFooter) {
        blocks.push(paragraph(addedByFooter));
    }

    return blocks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getRichTextPlainText(value: unknown): string {
    if (!Array.isArray(value)) return '';

    return value
        .map((entry) => {
            if (!isRecord(entry)) return '';
            const plainText = entry.plain_text;
            return typeof plainText === 'string' ? plainText : '';
        })
        .join('');
}

function getTitleFromProperties(
    properties: Record<string, unknown> | undefined,
    titleProperty: string
): string {
    const property = properties?.[titleProperty];
    if (!isRecord(property)) return 'Untitled feedback';

    return getRichTextPlainText(property.title) || 'Untitled feedback';
}

function getStatusFromProperties(
    properties: Record<string, unknown> | undefined,
    statusProperty: string,
    fallback: string
): string {
    const property = properties?.[statusProperty];
    if (!isRecord(property)) return fallback;
    const status = property.status;
    if (isRecord(status) && typeof status.name === 'string') return status.name;
    const select = property.select;
    if (isRecord(select) && typeof select.name === 'string') return select.name;

    return fallback;
}

function getStatusOptions(property: NotionPropertySchema | undefined): string[] {
    return (
        property?.status?.options
            ?.map((option) => option.name)
            .filter((name): name is string => Boolean(name)) ??
        property?.select?.options
            ?.map((option) => option.name)
            .filter((name): name is string => Boolean(name)) ??
        []
    );
}

function getPlainText(value: unknown): string {
    if (!Array.isArray(value)) return '';

    return value
        .map((entry) => {
            if (!isRecord(entry)) return '';

            const plainText = entry.plain_text;
            if (typeof plainText === 'string') return plainText;

            const textValue = entry.text;
            if (isRecord(textValue) && typeof textValue.content === 'string') {
                return textValue.content;
            }

            return '';
        })
        .join('')
        .trim();
}

function getBlockData(block: NotionBlockResponse): Record<string, unknown> | undefined {
    const data = block[block.type];
    return isRecord(data) ? data : undefined;
}

function getBlockText(block: NotionBlockResponse): string {
    const blockData = getBlockData(block);
    if (!blockData) return '';

    if (block.type === 'child_page' && typeof blockData.title === 'string') {
        return blockData.title.trim();
    }

    if (block.type === 'unsupported') {
        return 'This content is not supported in the app yet.';
    }

    return getPlainText(blockData.rich_text);
}

function getAttachmentCaption(blockData: Record<string, unknown>): string | undefined {
    const caption = getPlainText(blockData.caption);
    return caption || undefined;
}

function getAttachmentUrl(blockData: Record<string, unknown>): string | undefined {
    const external = blockData.external;
    if (isRecord(external) && typeof external.url === 'string') {
        return external.url;
    }

    const file = blockData.file;
    if (isRecord(file) && typeof file.url === 'string') {
        return file.url;
    }

    const url = blockData.url;
    return typeof url === 'string' ? url : undefined;
}

function getAttachmentName(
    blockType: string,
    blockData: Record<string, unknown>,
    fallbackIndex: number
): string {
    const caption = getAttachmentCaption(blockData);
    if (caption) return caption;

    const name = blockData.name;
    if (typeof name === 'string' && name.trim()) {
        return name.trim();
    }

    return `${blockType.replace(/_/g, ' ')} ${fallbackIndex}`;
}

function getDetailAttachmentContentType(blockData: Record<string, unknown>): string | undefined {
    const contentType = blockData.content_type;
    return typeof contentType === 'string' && contentType.trim() ? contentType.trim() : undefined;
}

async function listAllBlockChildren(
    notion: NotionClient,
    blockId: string
): Promise<NotionBlockResponse[]> {
    const blocks: NotionBlockResponse[] = [];
    let cursor: string | undefined;

    do {
        const response = await notion.listBlockChildren(blockId, cursor);
        blocks.push(...response.results);
        cursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
    } while (cursor);

    return blocks;
}

async function buildFeedbackDetailContent(
    notion: NotionClient,
    blockId: string
): Promise<{ content: FeedbackDetailContentBlock[]; attachments: FeedbackDetailAttachment[] }> {
    const blocks = await listAllBlockChildren(notion, blockId);
    const content: FeedbackDetailContentBlock[] = [];
    const attachments: FeedbackDetailAttachment[] = [];

    for (const [index, block] of blocks.entries()) {
        const blockData = getBlockData(block);

        if (blockData && FEEDBACK_DETAIL_ATTACHMENT_BLOCK_TYPES.has(block.type)) {
            const url = getAttachmentUrl(blockData);

            if (url) {
                attachments.push({
                    name: getAttachmentName(block.type, blockData, index + 1),
                    url,
                    type: getDetailAttachmentContentType(blockData) || block.type,
                    caption: getAttachmentCaption(blockData),
                });
            }
        }

        const includeText =
            FEEDBACK_DETAIL_TEXT_BLOCK_TYPES.has(block.type) ||
            block.type === 'child_page' ||
            block.type === 'unsupported';

        const textValue = includeText ? getBlockText(block) : '';
        let children: FeedbackDetailContentBlock[] | undefined;
        let childAttachments: FeedbackDetailAttachment[] = [];

        if (block.has_children) {
            const nested = await buildFeedbackDetailContent(notion, block.id);
            children = nested.content.length ? nested.content : undefined;
            childAttachments = nested.attachments;
        }

        if (textValue || children?.length) {
            const nextBlock: FeedbackDetailContentBlock = {
                id: block.id,
                type: block.type,
                text: textValue,
            };

            if (block.type === 'to_do' && blockData) {
                nextBlock.checked = blockData.checked === true;
            }

            if (children?.length) {
                nextBlock.children = children;
            }

            content.push(nextBlock);
        }

        if (childAttachments.length > 0) {
            attachments.push(...childAttachments);
        }
    }

    return { content, attachments };
}

function buildFeedbackDetail(
    page: NotionPage,
    detail: {
        content: FeedbackDetailContentBlock[];
        attachments: FeedbackDetailAttachment[];
    }
): FeedbackDetailResult {
    return {
        id: page.id,
        title: getTitleFromProperties(page.properties, TITLE_PROPERTY),
        status: getStatusFromProperties(page.properties, STATUS_PROPERTY, FEEDBACK_STATUS),
        url: page.url,
        createdAt: page.created_time,
        updatedAt: page.last_edited_time,
        content: detail.content,
        attachments: detail.attachments,
    };
}

function validateTargetSchema(schema: NotionTargetSchema) {
    const titleProperty = schema.properties?.[TITLE_PROPERTY];
    const statusProperty = schema.properties?.[STATUS_PROPERTY];

    if (titleProperty?.type && titleProperty.type !== 'title') {
        throw new InternalServerError('Feedback destination is not configured correctly.');
    }

    if (!titleProperty) {
        throw new InternalServerError('Feedback destination is not configured correctly.');
    }

    if (!statusProperty?.status && !statusProperty?.select) {
        throw new InternalServerError('Feedback destination is not configured correctly.');
    }

    if (!getStatusOptions(statusProperty).includes(FEEDBACK_STATUS)) {
        throw new InternalServerError('Feedback destination is missing the Feedback status.');
    }
}

function buildColumnsFromSchema(schema: NotionTargetSchema): FeedbackBoardColumn[] {
    const statusProperty = schema.properties?.[STATUS_PROPERTY];
    const statusOptions = getStatusOptions(statusProperty);
    const statuses = statusOptions.length ? statusOptions : [FEEDBACK_STATUS];

    return statuses.map((status) => ({
        id:
            status
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') || status,
        title: status,
        status,
        items: [],
    }));
}

async function getTargetSchema(notion: NotionClient, config: NotionTargetConfig) {
    return notion.retrieveDatabase(config.id);
}

async function queryFeedbackPages(
    notion: NotionClient,
    config: NotionTargetConfig,
    cursor?: string
) {
    const input = {
        page_size: 100,
        ...(cursor && { start_cursor: cursor }),
        sorts: [
            {
                timestamp: 'last_edited_time',
                direction: 'descending',
            },
        ],
    };

    return notion.queryDatabase(config.id, input);
}

async function getFeedbackItems(
    notion: NotionClient,
    config: NotionTargetConfig
): Promise<FeedbackBoardItem[]> {
    const items: FeedbackBoardItem[] = [];
    let cursor: string | undefined;

    do {
        const pages = await queryFeedbackPages(notion, config, cursor);

        for (const page of pages.results) {
            items.push({
                id: page.id,
                title: getTitleFromProperties(page.properties, TITLE_PROPERTY),
                status: getStatusFromProperties(page.properties, STATUS_PROPERTY, FEEDBACK_STATUS),
                url: page.url,
                createdAt: page.created_time,
                updatedAt: page.last_edited_time,
            });
        }

        cursor = pages.has_more && pages.next_cursor ? pages.next_cursor : undefined;
    } while (cursor);

    return items;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUploadedFile(
    notion: NotionClient,
    fileUploadId: string
): Promise<{ id: string }> {
    const delays = [0, 250, 500, 1000, 2000, 4000];

    for (const delay of delays) {
        if (delay > 0) {
            await sleep(delay);
        }

        const upload = await notion.retrieveFileUpload(fileUploadId);

        if (upload.status === 'uploaded') {
            return { id: upload.id };
        }

        if (upload.status === 'failed' || upload.status === 'expired') {
            throw new InternalServerError('Failed to upload feedback attachment.');
        }
    }

    throw new InternalServerError('Feedback attachment is still processing. Please try again.');
}

async function uploadSinglePartAttachment(
    notion: NotionClient,
    attachment: FeedbackAttachment
): Promise<{ id: string; name: string }> {
    const created = await notion.createFileUpload({
        filename: attachment.name,
        contentType: getAttachmentContentType(attachment),
    });
    const uploaded = await notion.sendFileUpload({
        fileUploadId: created.id,
        file: attachment.file,
        filename: attachment.name,
    });

    if (uploaded.status === 'uploaded') {
        return { id: uploaded.id, name: attachment.name };
    }

    const completed = await waitForUploadedFile(notion, uploaded.id);
    return { id: completed.id, name: attachment.name };
}

async function uploadMultiPartAttachment(
    notion: NotionClient,
    attachment: FeedbackAttachment
): Promise<{ id: string; name: string }> {
    const numberOfParts = Math.ceil(attachment.size / NOTION_MULTI_PART_CHUNK_BYTES);
    const created = await notion.createFileUpload({
        filename: attachment.name,
        contentType: getAttachmentContentType(attachment),
        mode: 'multi_part',
        numberOfParts,
    });

    for (let partIndex = 0; partIndex < numberOfParts; partIndex += 1) {
        const start = partIndex * NOTION_MULTI_PART_CHUNK_BYTES;
        const end = Math.min(start + NOTION_MULTI_PART_CHUNK_BYTES, attachment.size);

        await notion.sendFileUpload({
            fileUploadId: created.id,
            file: attachment.file.slice(start, end),
            filename: attachment.name,
            partNumber: partIndex + 1,
        });
    }

    const completed = await notion.completeFileUpload(created.id);
    if (completed.status === 'uploaded') {
        return { id: completed.id, name: attachment.name };
    }

    const uploaded = await waitForUploadedFile(notion, created.id);
    return { id: uploaded.id, name: attachment.name };
}

async function uploadAttachments(
    notion: NotionClient,
    attachments: FeedbackAttachment[]
): Promise<Array<{ id: string; name: string }>> {
    const uploadedFiles: Array<{ id: string; name: string }> = [];

    for (const attachment of attachments) {
        const uploaded =
            attachment.size <= NOTION_SINGLE_PART_MAX_FILE_BYTES
                ? await uploadSinglePartAttachment(notion, attachment)
                : await uploadMultiPartAttachment(notion, attachment);

        uploadedFiles.push(uploaded);
    }

    return uploadedFiles;
}

export const FeedbackService = {
    async getBoard(): Promise<FeedbackBoardResult> {
        const config = getTargetConfig();
        const notion = NotionClient.fromEnv();
        const schema = await getTargetSchema(notion, config);
        const items = await getFeedbackItems(notion, config);
        const columns = buildColumnsFromSchema(schema);
        const columnByStatus = new Map(columns.map((column) => [column.status, column]));

        items.forEach((item) => {
            const column = columnByStatus.get(item.status);

            if (column) {
                column.items.push(item);
                return;
            }

            columns.push({
                id: item.status
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, ''),
                title: item.status,
                status: item.status,
                items: [item],
            });
        });

        return { columns };
    },

    async submitFeedback(input: FeedbackSubmitRequest): Promise<FeedbackSubmitResult> {
        validateAttachments(input.files);

        const config = getTargetConfig();
        const notion = NotionClient.fromEnv();
        const schema = await getTargetSchema(notion, config);
        const title = deriveTitle(input.title, input.message);

        validateTargetSchema(schema);

        const uploadedFiles = await uploadAttachments(notion, input.files);
        const properties: Record<string, unknown> = {
            [TITLE_PROPERTY]: {
                title: [text(title)],
            },
            [STATUS_PROPERTY]: { status: { name: FEEDBACK_STATUS } },
        };

        const page = await notion.createPage(
            {
                parent: { type: 'database_id', database_id: config.id },
                properties,
                children: buildChildren(input, uploadedFiles),
            },
            notion.legacyDatabaseVersion
        );

        return {
            id: page.id,
            notionPageId: page.id,
            notionUrl: page.url,
        };
    },

    async getDetail(id: string): Promise<FeedbackDetailResult> {
        const notion = NotionClient.fromEnv();
        const page = await notion.retrievePage(id);
        const detail = await buildFeedbackDetailContent(notion, id);

        return buildFeedbackDetail(page, detail);
    },
};
