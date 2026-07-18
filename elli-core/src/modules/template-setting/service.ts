import { Prisma, TemplateSetting, TemplateSettingKind } from '@db/client';
import { prisma } from '@lib/prisma';
import { ActivityLogService, activityChange, formatEnumActivityValue } from '@modules/activity-log';
import { BadRequestError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';

import {
    MailFeatureTemplateValue,
    MailFeatureTemplateValueSchema,
    MailSenderGroupTemplateValue,
    MailSenderGroupTemplateValueSchema,
    MailSignatureTemplateValue,
    MailSignatureTemplateValueSchema,
    PdfNoticeTemplateValue,
    PdfNoticeTemplateValueSchema,
    PdfProfileTemplateValue,
    PdfProfileTemplateValueSchema,
    PdfTermsTemplateValue,
    PdfTermsTemplateValueSchema,
    TemplateSettingCreateRequest,
    TemplateSettingKindInput,
    TemplateSettingListQuery,
    TemplateSettingUpdateRequest,
} from './models';

type TemplateValue =
    | PdfTermsTemplateValue
    | PdfNoticeTemplateValue
    | MailFeatureTemplateValue
    | MailSenderGroupTemplateValue
    | MailSignatureTemplateValue
    | PdfProfileTemplateValue;

export type TemplateSettingResponse = Omit<TemplateSetting, 'value'> & {
    value: TemplateValue;
};

function normalizeTags(tags: string[] | undefined): string[] {
    return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

function toJsonValue(value: TemplateValue): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function validateValue(kind: TemplateSettingKindInput, value: unknown): TemplateValue {
    switch (kind) {
        case 'PDF_TERMS':
            return PdfTermsTemplateValueSchema.parse(value);
        case 'PDF_NOTICE':
            return PdfNoticeTemplateValueSchema.parse(value);
        case 'MAIL_FEATURE':
            return MailFeatureTemplateValueSchema.parse(value);
        case 'MAIL_SENDER_GROUP':
            return MailSenderGroupTemplateValueSchema.parse(value);
        case 'MAIL_SIGNATURE':
            return MailSignatureTemplateValueSchema.parse(value);
        case 'PDF_PROFILE':
            return PdfProfileTemplateValueSchema.parse(value);
    }
}

function serialize(setting: TemplateSetting): TemplateSettingResponse {
    return {
        ...setting,
        value: validateValue(setting.kind, setting.value),
    };
}

async function getActiveDefault(kind: TemplateSettingKind, key: string) {
    return prisma.templateSetting.findFirst({
        where: {
            kind,
            key,
            isDefault: true,
            status: 'ACTIVE',
            deletedAt: null,
        },
        orderBy: [{ updatedAt: 'desc' }],
    });
}

async function hasActiveDefault(kind: TemplateSettingKind, key: string) {
    return (
        (await prisma.templateSetting.count({
            where: {
                kind,
                key,
                isDefault: true,
                status: 'ACTIVE',
                deletedAt: null,
            },
        })) > 0
    );
}

async function logTemplateActivity({
    userId,
    setting,
    action,
    description,
}: {
    userId: string;
    setting: Pick<TemplateSetting, 'id' | 'name' | 'kind' | 'key'>;
    action: 'create' | 'update' | 'delete';
    description: string;
}) {
    await ActivityLogService.log({
        userId,
        entityType: 'template',
        entityId: setting.id,
        action,
        description,
        affectedEntityIds: [`${setting.kind}:${setting.key}`],
    });
}

export const TemplateSettingService = {
    list: async (query: TemplateSettingListQuery): Promise<TemplateSettingResponse[]> => {
        const rows = await prisma.templateSetting.findMany({
            where: {
                ...(query.kind && { kind: query.kind }),
                ...(query.key && { key: query.key }),
                ...(query.status && { status: query.status }),
                ...(!query.includeDeleted && { deletedAt: null }),
            },
            orderBy: [{ kind: 'asc' }, { key: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
        });

        return rows.map(serialize);
    },

    get: async (id: string): Promise<TemplateSettingResponse> => {
        const setting = await prisma.templateSetting.findUnique({ where: { id } });
        if (!setting || setting.deletedAt) throw new NotFoundError('Template setting not found');
        return serialize(setting);
    },

    create: async (
        request: TemplateSettingCreateRequest,
        userId: string
    ): Promise<TemplateSettingResponse> => {
        const value = validateValue(request.kind, request.value);
        if (request.isDefault && request.status !== 'ACTIVE') {
            throw new BadRequestError('Default templates must be active');
        }

        const shouldDefault =
            request.status === 'ACTIVE' &&
            (request.isDefault || !(await hasActiveDefault(request.kind, request.key)));

        const setting = await prisma.$transaction(async (tx) => {
            if (shouldDefault) {
                await tx.templateSetting.updateMany({
                    where: {
                        kind: request.kind,
                        key: request.key,
                        deletedAt: null,
                    },
                    data: { isDefault: false },
                });
            }

            return tx.templateSetting.create({
                data: {
                    id: generateNanoId(),
                    kind: request.kind,
                    key: request.key,
                    name: request.name,
                    description: request.description ?? null,
                    value: toJsonValue(value),
                    tags: normalizeTags(request.tags),
                    isDefault: shouldDefault,
                    status: request.status,
                    createdBy: userId,
                    updatedBy: userId,
                },
            });
        });

        await logTemplateActivity({
            userId,
            setting,
            action: 'create',
            description: `Created ${setting.name} template`,
        });

        return serialize(setting);
    },

    update: async (
        request: TemplateSettingUpdateRequest,
        userId: string
    ): Promise<TemplateSettingResponse> => {
        const existing = await prisma.templateSetting.findUnique({ where: { id: request.id } });
        if (!existing || existing.deletedAt) throw new NotFoundError('Template setting not found');

        const nextKind = request.kind ?? existing.kind;
        const nextKey = request.key ?? existing.key;
        const nextStatus = request.status ?? existing.status;
        const nextValue = validateValue(nextKind, request.value ?? existing.value);
        const shouldDefault = request.isDefault === true;
        const movedDefault =
            existing.isDefault && (nextKind !== existing.kind || nextKey !== existing.key);

        if (existing.isDefault && request.isDefault === false) {
            throw new BadRequestError(
                'Set another template as default before removing default status'
            );
        }
        if ((existing.isDefault || shouldDefault) && nextStatus !== 'ACTIVE') {
            throw new BadRequestError('Default templates must be active');
        }

        const setting = await prisma.$transaction(async (tx) => {
            if (shouldDefault || movedDefault) {
                await tx.templateSetting.updateMany({
                    where: {
                        kind: nextKind,
                        key: nextKey,
                        id: { not: request.id },
                        deletedAt: null,
                    },
                    data: { isDefault: false },
                });
            }

            return tx.templateSetting.update({
                where: { id: request.id },
                data: {
                    kind: nextKind,
                    key: nextKey,
                    name: request.name ?? existing.name,
                    description:
                        request.description === undefined
                            ? existing.description
                            : (request.description ?? null),
                    value: toJsonValue(nextValue),
                    tags: request.tags === undefined ? existing.tags : normalizeTags(request.tags),
                    isDefault: request.isDefault ?? existing.isDefault,
                    status: nextStatus,
                    updatedBy: userId,
                },
            });
        });

        await ActivityLogService.logFieldUpdate({
            userId,
            entityType: 'template',
            entityId: setting.id,
            subject: { label: 'Template', name: `${setting.name} template` },
            changes: [
                activityChange('Kind', existing.kind, setting.kind, formatEnumActivityValue, {
                    section: 'Configuration',
                }),
                activityChange('Key', existing.key, setting.key, undefined, {
                    section: 'Configuration',
                }),
                activityChange('Name', existing.name, setting.name, undefined, {
                    section: 'Details',
                }),
                activityChange(
                    'Description',
                    existing.description,
                    setting.description,
                    undefined,
                    {
                        section: 'Details',
                    }
                ),
                activityChange('Content', existing.value, setting.value, undefined, {
                    section: 'Content',
                }),
                activityChange('Tags', existing.tags, setting.tags, undefined, {
                    section: 'Details',
                    valueType: 'list',
                }),
                activityChange('Default', existing.isDefault, setting.isDefault, undefined, {
                    section: 'Status',
                    valueType: 'boolean',
                }),
                activityChange('Status', existing.status, setting.status, formatEnumActivityValue, {
                    section: 'Status',
                    valueType: 'status',
                }),
            ],
            affectedEntityIds: [`${setting.kind}:${setting.key}`],
        });

        return serialize(setting);
    },

    setDefault: async (id: string, userId: string): Promise<TemplateSettingResponse> => {
        const existing = await prisma.templateSetting.findUnique({ where: { id } });
        if (!existing || existing.deletedAt) throw new NotFoundError('Template setting not found');
        if (existing.status !== 'ACTIVE') {
            throw new BadRequestError('Only active templates can be set as default');
        }

        const setting = await prisma.$transaction(async (tx) => {
            await tx.templateSetting.updateMany({
                where: {
                    kind: existing.kind,
                    key: existing.key,
                    id: { not: id },
                    deletedAt: null,
                },
                data: { isDefault: false },
            });

            return tx.templateSetting.update({
                where: { id },
                data: { isDefault: true, updatedBy: userId },
            });
        });

        await logTemplateActivity({
            userId,
            setting,
            action: 'update',
            description: `Set ${setting.name} as the default template`,
        });

        return serialize(setting);
    },

    remove: async (id: string, userId: string): Promise<void> => {
        const existing = await prisma.templateSetting.findUnique({ where: { id } });
        if (!existing || existing.deletedAt) throw new NotFoundError('Template setting not found');
        if (existing.isDefault) {
            throw new BadRequestError('Set another template as default before deleting this one');
        }

        await prisma.templateSetting.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: userId,
                updatedBy: userId,
                isDefault: false,
            },
        });

        await logTemplateActivity({
            userId,
            setting: existing,
            action: 'delete',
            description: `Deleted ${existing.name} template`,
        });
    },

    getDefaultPdfTerms: async (section: string): Promise<PdfTermsTemplateValue | null> => {
        const setting = await getActiveDefault('PDF_TERMS', section);
        if (!setting) return null;
        return PdfTermsTemplateValueSchema.parse(setting.value);
    },

    getDefaultPdfNotice: async (section: string): Promise<PdfNoticeTemplateValue | null> => {
        const setting = await getActiveDefault('PDF_NOTICE', section);
        if (!setting) return null;
        return PdfNoticeTemplateValueSchema.parse(setting.value);
    },

    getDefaultMailFeature: async (feature: string): Promise<MailFeatureTemplateValue | null> => {
        const setting = await getActiveDefault('MAIL_FEATURE', feature);
        if (!setting) return null;
        return MailFeatureTemplateValueSchema.parse(setting.value);
    },

    getDefaultMailSenderGroup: async (
        groupKey: string
    ): Promise<MailSenderGroupTemplateValue | null> => {
        const setting = await getActiveDefault('MAIL_SENDER_GROUP', groupKey);
        if (!setting) return null;
        return MailSenderGroupTemplateValueSchema.parse(setting.value);
    },

    getDefaultMailSignature: async (): Promise<MailSignatureTemplateValue | null> => {
        const setting = await getActiveDefault('MAIL_SIGNATURE', 'global');
        if (!setting) return null;
        return MailSignatureTemplateValueSchema.parse(setting.value);
    },

    getDefaultPdfProfile: async (profileKey: string): Promise<PdfProfileTemplateValue | null> => {
        const setting = await getActiveDefault('PDF_PROFILE', profileKey);
        if (!setting) return null;
        return PdfProfileTemplateValueSchema.parse(setting.value);
    },

    getDefaultPdfProfiles: async (): Promise<Record<string, PdfProfileTemplateValue>> => {
        const settings = await prisma.templateSetting.findMany({
            where: {
                kind: 'PDF_PROFILE',
                isDefault: true,
                status: 'ACTIVE',
                deletedAt: null,
            },
        });

        return Object.fromEntries(
            settings.map((setting) => [
                setting.key,
                PdfProfileTemplateValueSchema.parse(setting.value),
            ])
        );
    },
};
