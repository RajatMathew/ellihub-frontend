import { success } from '@utils';
import { BadRequestError } from '@utils/error';
import { Hono } from 'hono';

import { FeedbackMetadataSchema, type FeedbackAttachment } from './models';
import { FeedbackService } from './service';

const app = new Hono();

function collectFiles(
    body: Record<string, File | string | (File | string)[]>
): FeedbackAttachment[] {
    const values = [body.files, body['files[]']].flatMap((value) =>
        Array.isArray(value) ? value : value ? [value] : []
    );

    return values
        .filter((value): value is File => value instanceof File)
        .map((file) => ({
            file,
            name: file.name,
            type: file.type,
            size: file.size,
        }));
}

function getStringField(
    body: Record<string, File | string | (File | string)[]>,
    key: string
): string | undefined {
    const value = body[key];
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];

    return undefined;
}

app.get('/', async (c) => {
    const board = await FeedbackService.getBoard();
    return success(c, board);
});

app.get('/:id', async (c) => {
    const id = c.req.param('id')?.trim();

    if (!id) {
        throw new BadRequestError('Feedback id is required.');
    }

    const feedback = await FeedbackService.getDetail(id);
    return success(c, feedback);
});

app.post('/', async (c) => {
    const body = await c.req.parseBody({ all: true });
    const metadata = FeedbackMetadataSchema.parse({
        title: getStringField(body, 'title'),
        message: getStringField(body, 'message'),
        currentUrl: getStringField(body, 'currentUrl'),
        userAgent: getStringField(body, 'userAgent'),
    });
    const user = c.get('user');

    if (!user?.id) {
        throw new BadRequestError('Unable to identify feedback submitter.');
    }

    const feedback = await FeedbackService.submitFeedback({
        ...metadata,
        currentUrl: metadata.currentUrl || undefined,
        userAgent: metadata.userAgent || undefined,
        files: collectFiles(body),
        submittedBy: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
        appVersion: c.req.header('x-app-version'),
        platform: c.req.header('x-platform'),
        submittedAt: new Date().toISOString(),
    });

    return success(c, feedback, 201);
});

export default app;
