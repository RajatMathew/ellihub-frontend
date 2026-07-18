import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AccountParamSchema,
    AttachmentParamSchema,
    AuthStartQuerySchema,
    ConversationParamSchema,
    CreateFolderSchema,
    CreateTagSchema,
    MessageListQuerySchema,
    MessageParamSchema,
    MoveMessageSchema,
    ReplyMessageSchema,
    SendMessageSchema,
    SyncQuerySchema,
    UpdateMessageStatusSchema,
    UpdateMessageTagsSchema,
} from './models';
import { EmailService } from './service';

import type { Context } from 'hono';

const app = new Hono();

async function getRequestContext(c: Context) {
    return EmailService.getRequestContext({
        userId: c.get('user')!.id,
        organizationId: c.get('session')?.activeOrganizationId,
    });
}

app.get('/accounts', requirePermission({ mail: ['read'] }), async (c) => {
    const accounts = await EmailService.listAccounts(await getRequestContext(c));
    return success(c, accounts);
});

app.get(
    '/auth/start',
    requirePermission({ mail: ['read'] }),
    zValidator('query', AuthStartQuerySchema),
    async (c) => {
        const result = await EmailService.createAuthorizationUrl(
            await getRequestContext(c),
            c.req.valid('query')
        );
        return success(c, result);
    }
);

app.delete(
    '/accounts/:accountId',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AccountParamSchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const result = await EmailService.disconnectAccount(await getRequestContext(c), accountId);
        return success(c, result);
    }
);

app.post(
    '/accounts/:accountId/check',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AccountParamSchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const result = await EmailService.checkAccount(await getRequestContext(c), accountId);
        return success(c, result);
    }
);

app.post(
    '/accounts/:accountId/sync',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AccountParamSchema),
    zValidator('query', SyncQuerySchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const result = await EmailService.syncAccount(
            await getRequestContext(c),
            accountId,
            c.req.valid('query').daysWithin
        );
        return success(c, result);
    }
);

app.get(
    '/accounts/:accountId/sync-status',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AccountParamSchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const result = await EmailService.getSyncStatus(await getRequestContext(c), accountId);
        return success(c, result);
    }
);

app.get(
    '/accounts/:accountId/folders',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AccountParamSchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const result = await EmailService.listFolders(await getRequestContext(c), accountId);
        return success(c, result);
    }
);

app.post(
    '/accounts/:accountId/folders',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AccountParamSchema),
    zValidator('json', CreateFolderSchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const result = await EmailService.createFolder(
            await getRequestContext(c),
            accountId,
            c.req.valid('json')
        );
        return success(c, result, 201);
    }
);

app.get(
    '/accounts/:accountId/tags',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AccountParamSchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const result = await EmailService.listTags(await getRequestContext(c), accountId);
        return success(c, result);
    }
);

app.post(
    '/accounts/:accountId/tags',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AccountParamSchema),
    zValidator('json', CreateTagSchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const result = await EmailService.createTag(
            await getRequestContext(c),
            accountId,
            c.req.valid('json')
        );
        return success(c, result, 201);
    }
);

app.get(
    '/accounts/:accountId/messages',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AccountParamSchema),
    zValidator('query', MessageListQuerySchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const query = c.req.valid('query');
        const result = await EmailService.listMessages(
            await getRequestContext(c),
            accountId,
            query
        );
        return success(c, result);
    }
);

app.get(
    '/accounts/:accountId/messages/:messageId',
    requirePermission({ mail: ['read'] }),
    zValidator('param', MessageParamSchema),
    async (c) => {
        const { accountId, messageId } = c.req.valid('param');
        const result = await EmailService.getMessage(
            await getRequestContext(c),
            accountId,
            messageId
        );
        return success(c, result, 200, 'OK', undefined, 'message');
    }
);

app.get(
    '/accounts/:accountId/conversations/:threadId/messages',
    requirePermission({ mail: ['read'] }),
    zValidator('param', ConversationParamSchema),
    async (c) => {
        const { accountId, threadId } = c.req.valid('param');
        const result = await EmailService.getConversation(
            await getRequestContext(c),
            accountId,
            threadId
        );
        return success(c, result, 200, 'OK', undefined, 'messages');
    }
);

app.post(
    '/accounts/:accountId/messages/send',
    requirePermission({ mail: ['send'] }),
    zValidator('param', AccountParamSchema),
    zValidator('json', SendMessageSchema),
    async (c) => {
        const { accountId } = c.req.valid('param');
        const result = await EmailService.sendMessage(
            await getRequestContext(c),
            accountId,
            c.req.valid('json')
        );
        return success(c, result, 201);
    }
);

app.post(
    '/accounts/:accountId/messages/:messageId/reply',
    requirePermission({ mail: ['send'] }),
    zValidator('param', MessageParamSchema),
    zValidator('json', ReplyMessageSchema),
    async (c) => {
        const { accountId, messageId } = c.req.valid('param');
        const result = await EmailService.replyMessage(
            await getRequestContext(c),
            accountId,
            messageId,
            c.req.valid('json')
        );
        return success(c, result);
    }
);

app.patch(
    '/accounts/:accountId/messages/:messageId/status',
    requirePermission({ mail: ['read'] }),
    zValidator('param', MessageParamSchema),
    zValidator('json', UpdateMessageStatusSchema),
    async (c) => {
        const { accountId, messageId } = c.req.valid('param');
        const result = await EmailService.updateMessageStatus(
            await getRequestContext(c),
            accountId,
            messageId,
            c.req.valid('json')
        );
        return success(c, result);
    }
);

app.post(
    '/accounts/:accountId/messages/:messageId/move',
    requirePermission({ mail: ['read'] }),
    zValidator('param', MessageParamSchema),
    zValidator('json', MoveMessageSchema),
    async (c) => {
        const { accountId, messageId } = c.req.valid('param');
        const result = await EmailService.moveMessage(
            await getRequestContext(c),
            accountId,
            messageId,
            c.req.valid('json')
        );
        return success(c, result);
    }
);

app.patch(
    '/accounts/:accountId/messages/:messageId/tags',
    requirePermission({ mail: ['read'] }),
    zValidator('param', MessageParamSchema),
    zValidator('json', UpdateMessageTagsSchema),
    async (c) => {
        const { accountId, messageId } = c.req.valid('param');
        const result = await EmailService.updateMessageTags(
            await getRequestContext(c),
            accountId,
            messageId,
            c.req.valid('json')
        );
        return success(c, result);
    }
);

app.post(
    '/accounts/:accountId/messages/:messageId/archive',
    requirePermission({ mail: ['read'] }),
    zValidator('param', MessageParamSchema),
    async (c) => {
        const { accountId, messageId } = c.req.valid('param');
        const result = await EmailService.archiveMessage(
            await getRequestContext(c),
            accountId,
            messageId
        );
        return success(c, result);
    }
);

app.post(
    '/accounts/:accountId/messages/:messageId/unarchive',
    requirePermission({ mail: ['read'] }),
    zValidator('param', MessageParamSchema),
    async (c) => {
        const { accountId, messageId } = c.req.valid('param');
        const result = await EmailService.unarchiveMessage(
            await getRequestContext(c),
            accountId,
            messageId
        );
        return success(c, result);
    }
);

app.delete(
    '/accounts/:accountId/messages/:messageId',
    requirePermission({ mail: ['read'] }),
    zValidator('param', MessageParamSchema),
    async (c) => {
        const { accountId, messageId } = c.req.valid('param');
        const result = await EmailService.deleteMessage(
            await getRequestContext(c),
            accountId,
            messageId
        );
        return success(c, result);
    }
);

app.get(
    '/accounts/:accountId/messages/:messageId/attachments/:attachmentId',
    requirePermission({ mail: ['read'] }),
    zValidator('param', AttachmentParamSchema),
    async (c) => {
        const { accountId, messageId, attachmentId } = c.req.valid('param');
        const attachment = await EmailService.getAttachment(
            await getRequestContext(c),
            accountId,
            messageId,
            attachmentId
        );

        return new Response(attachment.bytes, {
            status: 200,
            headers: {
                'Content-Type': attachment.contentType,
                'Content-Disposition': `attachment; filename="${attachment.fileName.replaceAll('"', '')}"`,
                'Cache-Control': 'private, max-age=300',
            },
        });
    }
);

export default app;
