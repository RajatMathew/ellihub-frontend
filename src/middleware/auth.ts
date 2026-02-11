import { auth } from '@lib/auth';
import { PermissionStatement, ResourceName } from '@lib/permissions';
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware(async (c, next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!session.session.activeOrganizationId) {
        await auth.api.setActiveOrganization({
            body: {
                organizationSlug: 'default',
            },
            headers: c.req.raw.headers,
        });
    }

    // Attach session to context
    c.set('session', session.session);
    c.set('user', session.user);

    await next();
});

// Permission middleware factory

type PartialPermissions = {
    [K in ResourceName]?: Array<PermissionStatement[K][number]>;
};

export const requirePermission = (permissions: PartialPermissions) => {
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
