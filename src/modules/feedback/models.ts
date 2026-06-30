import z from 'zod';

export const FEEDBACK_MAX_FILES = 5;
export const FEEDBACK_MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;

export const FeedbackMetadataSchema = z.object({
    title: z.string().trim().max(120, 'Title must be 120 characters or fewer').optional(),
    message: z
        .string()
        .trim()
        .min(1, 'Feedback details are required')
        .max(5000, 'Feedback details must be 5,000 characters or fewer'),
    currentUrl: z.url().optional().or(z.literal('')),
    userAgent: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type FeedbackMetadataRequest = z.infer<typeof FeedbackMetadataSchema>;

export type FeedbackAttachment = {
    file: File;
    name: string;
    type: string;
    size: number;
};

export type FeedbackSubmitRequest = FeedbackMetadataRequest & {
    files: FeedbackAttachment[];
    submittedBy: {
        id: string;
        name?: string | null;
        email?: string | null;
    };
    appVersion?: string;
    platform?: string;
    submittedAt: string;
};

export type FeedbackSubmitResult = {
    id: string;
    notionPageId: string;
    notionUrl?: string;
};

export type FeedbackBoardItem = {
    id: string;
    title: string;
    status: string;
    url?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type FeedbackBoardColumn = {
    id: string;
    title: string;
    status: string;
    items: FeedbackBoardItem[];
};

export type FeedbackBoardResult = {
    columns: FeedbackBoardColumn[];
};

export type FeedbackDetailContentBlock = {
    id: string;
    type: string;
    text: string;
    checked?: boolean;
    children?: FeedbackDetailContentBlock[];
};

export type FeedbackDetailAttachment = {
    name: string;
    url: string;
    type: string;
    caption?: string;
};

export type FeedbackDetailResult = {
    id: string;
    title: string;
    status: string;
    url?: string;
    createdAt?: string;
    updatedAt?: string;
    content: FeedbackDetailContentBlock[];
    attachments: FeedbackDetailAttachment[];
};
