import { auth } from '@lib/auth';
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware(async (c, next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    // Attach session to context
    c.set('session', session.session);
    c.set('user', session.user);

    await next();
});

// Permission middleware factory
export const requirePermission = (permissions: Record<string, string[]>) => {
    return createMiddleware(async (c, next) => {
        const hasPermission = await auth.api.hasPermission({
            headers: c.req.raw.headers,
            body: { permissions },
        });

        if (!hasPermission) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        await next();
    });
};
