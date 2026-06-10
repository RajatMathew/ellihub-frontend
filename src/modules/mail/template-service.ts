import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TemplateSettingService } from '@modules/template-setting';
import { BadRequestError } from '@utils';

import {
    getMailAssetContentType,
    getMailAssetDataUri,
    mailAssetExists,
    readMailAsset,
} from './asset-service';

import type { MailAttachment } from './mail-service';
import type { FeatureMailDraftBase, FeatureMailKey, MailSignatureInput } from './models';

export type SignatureImageTemplate = {
    fileName: string;
    contentId: string;
    width: number;
    height: number;
    alt: string;
    line: number;
};

export type MailSignatureTemplate = {
    name: string;
    role: string;
    email: string;
    address: string;
    phone: string;
    fax: string;
    certificationLine: string;
    images: SignatureImageTemplate[];
};

export type MailPdfProfileTemplate = {
    company: {
        name: string;
        addressLines: string[];
        phone: string;
        logoPath: string;
    };
    shipToName: string;
};

export type MailFeatureTemplate = {
    defaultFrom?: string;
    senderGroup?: string;
    subject: string;
    body: string;
    pdfProfile?: string;
};

export type MailSenderGroupTemplate = {
    allowed: string[];
    default?: string;
};

export type MailTemplateConfig = {
    defaultFrom: string;
    email?: {
        senders?: Record<string, MailSenderGroupTemplate>;
    };
    signature: MailSignatureTemplate;
    pdfProfiles: Record<string, MailPdfProfileTemplate>;
    features: Record<string, MailFeatureTemplate>;
};

export type ResolvedMailFeatureTemplate = Omit<MailFeatureTemplate, 'pdfProfile'> & {
    defaultFrom: string;
    senderOptions: string[];
    signature: MailSignatureTemplate;
    pdfProfile?: MailPdfProfileTemplate;
};

export type TemplateContext = Record<string, string | number | null | undefined>;

type SignatureRenderMode = 'preview' | 'send';

const TEMPLATE_ROOT =
    process.env.MAIL_TEMPLATE_DIR || join(process.cwd(), 'src/modules/mail/templates');
const MAIL_TEMPLATE_CONFIG_PATH = join(TEMPLATE_ROOT, 'mail-defaults.json');
const SIGNATURE_TEXT_STYLE =
    'text-align:start;color:#0a2f41;background-color:#ffffff;font-size:16px;font-family:Aptos, sans-serif;margin:0 0 8px;';
const SINGLE_QUOTE = '\u0027';

function getFallbackMailTemplateConfig(): MailTemplateConfig {
    return JSON.parse(readFileSync(MAIL_TEMPLATE_CONFIG_PATH, 'utf-8')) as MailTemplateConfig;
}

export async function getMailTemplateConfig(): Promise<MailTemplateConfig> {
    const config = getFallbackMailTemplateConfig();
    const [senderGroups, mailFeatures, pdfProfiles, signatureTemplates] = await Promise.all([
        TemplateSettingService.list({
            kind: 'MAIL_SENDER_GROUP',
            status: 'ACTIVE',
            includeDeleted: false,
        }),
        TemplateSettingService.list({
            kind: 'MAIL_FEATURE',
            status: 'ACTIVE',
            includeDeleted: false,
        }),
        TemplateSettingService.list({
            kind: 'PDF_PROFILE',
            status: 'ACTIVE',
            includeDeleted: false,
        }),
        TemplateSettingService.list({
            kind: 'MAIL_SIGNATURE',
            status: 'ACTIVE',
            includeDeleted: false,
        }),
    ]);

    config.email = config.email ?? {};
    config.email.senders = config.email.senders ?? {};

    for (const setting of senderGroups) {
        if (setting.kind !== 'MAIL_SENDER_GROUP' || !setting.isDefault) continue;
        const value = setting.value as MailSenderGroupTemplate;
        config.email.senders[setting.key] = value;
    }

    for (const setting of mailFeatures) {
        if (setting.kind !== 'MAIL_FEATURE' || !setting.isDefault) continue;
        const value = setting.value as {
            senderGroup?: string;
            subject: string;
            body: string;
            pdfProfileKey?: string;
        };
        config.features[setting.key] = {
            senderGroup: value.senderGroup,
            subject: value.subject,
            body: value.body,
            pdfProfile: value.pdfProfileKey,
        };
    }

    for (const setting of pdfProfiles) {
        if (setting.kind !== 'PDF_PROFILE' || !setting.isDefault) continue;
        config.pdfProfiles[setting.key] = setting.value as MailPdfProfileTemplate;
    }

    const globalSignature = signatureTemplates.find(
        (setting) =>
            setting.kind === 'MAIL_SIGNATURE' && setting.key === 'global' && setting.isDefault
    );
    if (globalSignature) {
        config.signature = globalSignature.value as MailSignatureTemplate;
    }

    return config;
}

export async function getFeatureMailTemplate(
    feature: string
): Promise<ResolvedMailFeatureTemplate> {
    const config = await getMailTemplateConfig();
    const featureTemplate = config.features[feature];

    if (!featureTemplate) {
        throw new BadRequestError(`Mail feature template is not configured: ${feature}`);
    }

    const { pdfProfile, ...templateFields } = featureTemplate;
    const senderOptions = getFeatureSenderOptions(config, featureTemplate);
    const resolved = {
        ...templateFields,
        defaultFrom: getFeatureDefaultSender(config, featureTemplate, senderOptions),
        senderOptions,
        signature: config.signature,
    };

    if (!pdfProfile) return resolved;

    return {
        ...resolved,
        pdfProfile: getPdfProfile(config, pdfProfile),
    };
}

export async function getFeatureMailSenderOptions(feature: string): Promise<string[]> {
    const config = await getMailTemplateConfig();
    const featureTemplate = config.features[feature];

    if (!featureTemplate) {
        throw new BadRequestError(`Mail feature template is not configured: ${feature}`);
    }

    return getFeatureSenderOptions(config, featureTemplate);
}

export async function isAllowedFeatureMailSender(
    feature: string,
    mailbox: string
): Promise<boolean> {
    return (await getFeatureMailSenderOptions(feature)).includes(mailbox.trim().toLowerCase());
}

export async function buildDefaultFeatureMailDraft({
    feature,
    context,
    to,
    signature,
}: {
    feature: FeatureMailKey;
    context: TemplateContext;
    to: string[];
    signature?: MailSignatureInput;
}): Promise<FeatureMailDraftBase> {
    const template = await getFeatureMailTemplate(feature);
    const resolvedSignature = signature ?? {
        name: template.signature.name,
        role: template.signature.role,
        email: template.signature.email,
    };

    return {
        from: template.defaultFrom,
        to,
        cc: [],
        bcc: [],
        subject: renderTemplate(template.subject, context),
        body: renderTemplate(template.body, context),
        signature: resolvedSignature,
        attachmentIds: [],
        saveToSentItems: true,
    };
}

export function renderTemplate(template: string, context: TemplateContext): string {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => String(context[key] ?? ''));
}

export function buildFeatureEmailHtml(
    body: string,
    signature: MailSignatureInput,
    signatureTemplate: MailSignatureTemplate,
    mode: SignatureRenderMode
): string {
    return [
        '<div style="font-family:Aptos, Arial, sans-serif;font-size:15px;color:#111827;line-height:1.5;">',
        textToHtml(body),
        '</div>',
        buildSignatureHtml(signature, signatureTemplate, mode),
    ].join('');
}

export async function buildSignatureInlineAttachments(
    signatureTemplate: MailSignatureTemplate
): Promise<MailAttachment[]> {
    const attachments: MailAttachment[] = [];

    for (const image of signatureTemplate.images) {
        if (!mailAssetExists(image.fileName)) continue;

        const asset = await readMailAsset(image.fileName);
        attachments.push({
            name: asset.fileName,
            contentType: asset.contentType,
            contentBytes: Buffer.from(asset.bytes).toString('base64'),
            isInline: true,
            contentId: image.contentId,
        });
    }

    return attachments;
}

export function getSignatureAssetMetadata(signatureTemplate: MailSignatureTemplate) {
    return signatureTemplate.images
        .filter((image) => mailAssetExists(image.fileName))
        .map((image) => ({
            fileName: image.fileName,
            contentType: getMailAssetContentType(image.fileName),
            contentId: image.contentId,
        }));
}

function buildSignatureHtml(
    signature: MailSignatureInput,
    signatureTemplate: MailSignatureTemplate,
    mode: SignatureRenderMode
): string {
    const imageLineOne = renderSignatureImageLine(signatureTemplate.images, 1, mode);
    const imageLineTwo = renderSignatureImageLine(signatureTemplate.images, 2, mode);
    const mailto = `mailto:${escapeHtml(signature.email)}`;

    return [
        '<div style="margin-top:20px;font-family:Aptos, Arial, sans-serif;">',
        `<p style="${SIGNATURE_TEXT_STYLE}">Thank you,</p>`,
        `<p style="${SIGNATURE_TEXT_STYLE}">${escapeHtml(signature.name)}</p>`,
        `<p style="${SIGNATURE_TEXT_STYLE}">${escapeHtml(signature.role)}</p>`,
        imageLineOne,
        `<p style="${SIGNATURE_TEXT_STYLE}">${escapeHtml(signatureTemplate.address)}</p>`,
        `<p style="${SIGNATURE_TEXT_STYLE}">Tel: ${escapeHtml(signatureTemplate.phone)}, Fax: ${escapeHtml(signatureTemplate.fax)}</p>`,
        `<p style="${SIGNATURE_TEXT_STYLE}">Email: <a href="${mailto}" target="_blank" style="color:#1155cc;">${escapeHtml(signature.email)}</a></p>`,
        `<p style="${SIGNATURE_TEXT_STYLE}"><strong><em>${escapeHtml(signatureTemplate.certificationLine)}</em></strong></p>`,
        imageLineTwo,
        '</div>',
    ]
        .filter(Boolean)
        .join('');
}

function renderSignatureImageLine(
    images: SignatureImageTemplate[],
    line: number,
    mode: SignatureRenderMode
): string {
    const html = images
        .filter((image) => image.line === line && mailAssetExists(image.fileName))
        .map((image) => {
            const src =
                mode === 'send' ? `cid:${image.contentId}` : getMailAssetDataUri(image.fileName);

            if (!src) return '';

            return `<img src="${escapeHtml(src)}" alt="${escapeHtml(image.alt)}" width="${image.width}" height="${image.height}" style="display:inline-block;vertical-align:middle;border:0;margin-right:4px;">`;
        })
        .filter(Boolean)
        .join('');

    return html ? `<p style="${SIGNATURE_TEXT_STYLE}">${html}</p>` : '';
}

function getPdfProfile(config: MailTemplateConfig, profileName: string): MailPdfProfileTemplate {
    const pdfProfile = config.pdfProfiles[profileName];

    if (!pdfProfile) {
        throw new BadRequestError(`Mail PDF profile is not configured: ${profileName}`);
    }

    return pdfProfile;
}

function getFeatureSenderOptions(
    config: MailTemplateConfig,
    featureTemplate: MailFeatureTemplate
): string[] {
    const senderGroup = featureTemplate.senderGroup;
    const allowed = senderGroup ? (config.email?.senders?.[senderGroup]?.allowed ?? []) : [];

    return allowed.map((email) => email.trim().toLowerCase()).filter(Boolean);
}

function getFeatureDefaultSender(
    config: MailTemplateConfig,
    featureTemplate: MailFeatureTemplate,
    senderOptions: string[]
): string {
    const senderGroup = featureTemplate.senderGroup;
    const groupDefault = senderGroup ? config.email?.senders?.[senderGroup]?.default : undefined;
    const candidates = [
        groupDefault,
        featureTemplate.defaultFrom,
        senderOptions[0],
        config.defaultFrom,
    ];
    const selected = candidates
        .find((email): email is string => !!email)
        ?.trim()
        .toLowerCase();

    if (!selected) {
        throw new BadRequestError('Mail sender is not configured');
    }

    if (senderOptions.length > 0 && !senderOptions.includes(selected)) {
        return senderOptions[0];
    }

    return selected;
}

function textToHtml(value: string): string {
    return value
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map(
            (paragraph) =>
                `<p style="margin:0 0 12px;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`
        )
        .join('');
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll(SINGLE_QUOTE, '&#39;');
}
