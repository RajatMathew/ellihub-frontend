import { sendLoggedMail } from '@modules/mail/log-service';
import { getFeatureMailTemplate, renderTemplate } from '@modules/mail/template-service';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, organization } from 'better-auth/plugins';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';

import { initializeOrganizationRoles } from './organization-hooks';
import { ac, accountant, adminRole, ap, dev, member, owner, pm, user } from './permissions';
import { prisma } from './prisma';

const PASSWORD_RESET_EXPIRES_IN_SECONDS = 60 * 60;
const PASSWORD_RESET_EXPIRES_IN_MINUTES = PASSWORD_RESET_EXPIRES_IN_SECONDS / 60;

type PasswordResetMailUser = {
    id: string;
    email: string;
    name?: string | null;
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function textToHtml(value: string): string {
    return value
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map(
            (paragraph) =>
                `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`
        )
        .join('');
}

function buildPasswordResetEmailHtml(context: { resetUrl: string; body: string }): string {
    const resetUrl = escapeHtml(context.resetUrl);
    const bodyHtml = textToHtml(context.body);

    return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#111827;">Reset your password</h1>
      ${bodyHtml}
      <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;padding:12px 18px;">Reset password</a>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">If the button does not work, copy and paste this link into your browser:<br><span style="word-break:break-all;">${resetUrl}</span></p>
    </div>
  </body>
</html>`;
}

async function sendPasswordResetEmail(user: PasswordResetMailUser, resetUrl: string) {
    const template = await getFeatureMailTemplate('auth.passwordReset');
    const context = {
        userName: user.name || user.email,
        resetUrl,
        expiresInMinutes: PASSWORD_RESET_EXPIRES_IN_MINUTES,
    };
    const body = renderTemplate(template.body, context);

    await sendLoggedMail(
        {
            from: template.defaultFrom,
            to: [user.email],
            subject: renderTemplate(template.subject, context),
            html: buildPasswordResetEmailHtml({ resetUrl, body }),
            attachments: [],
            saveToSentItems: true,
        },
        {
            feature: 'auth.passwordReset',
            entityType: 'user',
            entityId: user.id,
            metadata: {
                purpose: 'password-reset',
                expiresInSeconds: PASSWORD_RESET_EXPIRES_IN_SECONDS,
            },
        }
    );
}

export const auth = betterAuth({
    trustedOrigins:
        process.env.NODE_ENV !== 'production'
            ? ['http://localhost:*', process.env.BETTER_AUTH_BASE_URL!, process.env.CLIENT_URL!]
            : [process.env.CLIENT_URL!, process.env.BETTER_AUTH_BASE_URL!],
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
        transaction: true,
    }),
    baseURL: process.env.BETTER_AUTH_BASE_URL!,
    basePath: '/api/v1/auth',
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60,
            strategy: 'jwe',
        },
    },
    advanced: {
        defaultCookieAttributes: {
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // allow cross-site
            secure: process.env.NODE_ENV === 'production', // required with sameSite: none
            httpOnly: true,
        },
        useSecureCookies: process.env.NODE_ENV === 'production',
    },
    emailAndPassword: {
        enabled: true,
        resetPasswordTokenExpiresIn: PASSWORD_RESET_EXPIRES_IN_SECONDS,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => {
            await sendPasswordResetEmail(user, url);
        },
    },
    plugins: [
        organization({
            ac, // Required: defines your fixed permissions
            roles: {
                dev,
                admin: adminRole,
                accountant,
                ap,
                pm,
                user,
                owner,
                member,
            },
            dynamicAccessControl: {
                enabled: true,
                maximumRolesPerOrganization: 50, // Optional limit
            },
            // Since you don't need multiple orgs:
            allowUserToCreateOrganization: false, // Prevent users from creating orgs
            organizationLimit: 1,
            organizationHooks: {
                afterCreateOrganization: async ({ organization: org }) => {
                    // Initialize default roles for the organization
                    await initializeOrganizationRoles(org.id);
                },
            },
        }),
        admin({
            defaultRole: 'user',
            adminRoles: ['dev', 'admin'],
            roles: {
                dev: adminAc,
                admin: adminAc,
                accountant: userAc,
                ap: userAc,
                pm: userAc,
                user: userAc,
                owner: adminAc,
                member: userAc,
            },
        }),
    ],
});
