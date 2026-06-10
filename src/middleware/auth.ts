import { getAccessContext, requireAdmin } from '@lib/access';
import { auth } from '@lib/auth';
import { PermissionStatement, ResourceName } from '@lib/permissions';
import { prisma } from '@lib/prisma';
import { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

const DEFAULT_ORGANIZATION_SLUG = 'default';

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

async function getPermissionOrganizationId(c: Context): Promise<string | undefined> {
    const session = c.get('session');
    if (session?.activeOrganizationId) return session.activeOrganizationId;

    const organization = await prisma.organization.findUnique({
        where: { slug: DEFAULT_ORGANIZATION_SLUG },
        select: { id: true },
    });

    return organization?.id;
}

export const requirePermission = (permissions: PartialPermissions) => {
    return createMiddleware(async (c, next) => {
        const organizationId = await getPermissionOrganizationId(c);
        const hasPermission = await auth.api.hasPermission({
            headers: c.req.raw.headers,
            body: { permissions, ...(organizationId && { organizationId }) },
        });

        if (hasPermission.success !== true) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        await next();
    });
};

export const requireAnyPermission = (permissionsList: PartialPermissions[]) => {
    return createMiddleware(async (c, next) => {
        const organizationId = await getPermissionOrganizationId(c);
        for (const permissions of permissionsList) {
            const hasPermission = await auth.api.hasPermission({
                headers: c.req.raw.headers,
                body: { permissions, ...(organizationId && { organizationId }) },
            });

            if (hasPermission.success === true) {
                await next();
                return;
            }
        }

        return c.json({ error: 'Forbidden' }, 403);
    });
};

export const requireAdminMiddleware = createMiddleware(async (c, next) => {
    await requireAdmin(c);
    await next();
});

export const accessContextMiddleware = createMiddleware(async (c, next) => {
    c.set('access', await getAccessContext(c));
    await next();
});
