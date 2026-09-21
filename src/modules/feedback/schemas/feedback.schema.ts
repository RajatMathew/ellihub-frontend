import {
  FEEDBACK_MAX_FILE_BYTES,
  FEEDBACK_MAX_FILES,
  isAllowedFeedbackFileType,
} from '@/modules/feedback/lib/feedback-file-validation';
import { z } from 'zod';

function isFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

export const feedbackFormSchema = z.object({
  title: z.string().trim().max(120, 'Title must be 120 characters or fewer.').optional(),
  /**
   * Who is giving the feedback. Prefilled from the session, and editable:
   * the signed-in account is not always the person — shared logins and
   * reporting on a colleague's behalf both make it the wrong answer.
   */
  submitterName: z.string().trim().max(120, 'Name must be 120 characters or fewer.').optional(),
  message: z
    .string()
    .trim()
    .min(1, 'Feedback details are required.')
    .max(5000, 'Feedback details must be 5,000 characters or fewer.'),
  files: z
    .array(z.custom<File>(isFile, 'Select valid files.'))
    .max(FEEDBACK_MAX_FILES, `Attach up to ${FEEDBACK_MAX_FILES} files.`)
    .refine((files) => files.every((file) => file.size > 0), {
      message: 'Attached files cannot be empty.',
    })
    .refine((files) => files.every((file) => file.size <= FEEDBACK_MAX_FILE_BYTES), {
      message: 'Each attachment must be 5 GB or smaller.',
    })
    .refine((files) => files.every(isAllowedFeedbackFileType), {
      message: 'Executable and script attachments are not allowed.',
    }),
});

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

export const feedbackSubmitResultSchema = z.object({
  id: z.string(),
  notionPageId: z.string(),
  notionUrl: z.string().optional(),
});

export type FeedbackSubmitResult = z.infer<typeof feedbackSubmitResultSchema>;

export const feedbackBoardItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  url: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type FeedbackBoardItem = z.infer<typeof feedbackBoardItemSchema>;

export const feedbackBoardColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  items: z.array(feedbackBoardItemSchema),
});

export type FeedbackBoardColumn = z.infer<typeof feedbackBoardColumnSchema>;

export const feedbackBoardSchema = z.object({
  columns: z.array(feedbackBoardColumnSchema),
});

export type FeedbackBoard = z.infer<typeof feedbackBoardSchema>;

export const feedbackDetailAttachmentSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  caption: z.string().optional(),
});

export type FeedbackDetailAttachment = z.infer<typeof feedbackDetailAttachmentSchema>;

export interface FeedbackDetailContentBlock {
  id: string;
  type: string;
  text: string;
  checked?: boolean;
  children?: FeedbackDetailContentBlock[];
}

export const feedbackDetailContentBlockSchema: z.ZodType<FeedbackDetailContentBlock> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    text: z.string(),
    checked: z.boolean().optional(),
    children: z.array(feedbackDetailContentBlockSchema).optional(),
  })
);

export const feedbackDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  url: z.string().url().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  content: z.array(feedbackDetailContentBlockSchema),
  attachments: z.array(feedbackDetailAttachmentSchema),
});

export type FeedbackDetail = z.infer<typeof feedbackDetailSchema>;
