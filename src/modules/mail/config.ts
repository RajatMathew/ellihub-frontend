const DEFAULT_SENDER_OPTIONS = [
    'sales@ellicorp.com',
    'bidding@ellicorp.com',
    'procurement@ellicorp.com',
];

export type MailConfig = {
    tenantId: string;
    clientId: string;
    clientSecret: string;
};

export function getMailConfig(): MailConfig {
    return {
        tenantId: requiredEnv('MS_TENANT_ID'),
        clientId: requiredEnv('MS_CLIENT_ID'),
        clientSecret: requiredEnv('MS_CLIENT_SECRET'),
    };
}

export function getMailSenderOptions(): string[] {
    const configured = parseEmailCsv(
        process.env.MAIL_ALLOWED_SENDERS || process.env.ALLOWED_SENDERS || ''
    );

    return configured.length ? configured : DEFAULT_SENDER_OPTIONS;
}

export function allowsCustomSender(): boolean {
    return false;
}

function requiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

function parseEmailCsv(value: string): string[] {
    return value
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
}
