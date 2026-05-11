import { auth } from '@lib/auth';
import { PermissionStatement, ResourceName } from '@lib/permissions';
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware(async (c, next) => {
    const WHITELIST: string[] = [];

    let whitelist = false;

    for (const p of WHITELIST) {
        if (c.req.path.startsWith(p)) {
            whitelist = true;
            break;
        }
    }

    if (!whitelist) {
        const session = await auth.api.getSession({
            headers: c.req.raw.headers,
        });

        if (!session) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        // Attach session to context
        c.set('session', session.session);
        c.set('user', session.user);

        if (!session.session.activeOrganizationId) {
            await auth.api.setActiveOrganization({
                body: {
                    organizationSlug: 'default',
                },
                headers: c.req.raw.headers,
            });
        }
    }

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
