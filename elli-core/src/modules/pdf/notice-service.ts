import { prisma } from '@lib/prisma';
import { getDefaultPdfNotice, getDefaultPdfNoticeIncludeByDefault } from '@modules/pdf/defaults';
import { TemplateSettingService } from '@modules/template-setting';
import { BadRequestError } from '@utils';

import { hasPdfTermsContent, sanitizePdfTermsHtml } from './terms-service';

const PDF_NOTICE_CONFIG_TYPE = 'pdf_notice';
const PDF_NOTICE_CONFIG_NAME = 'pdf.notice.include_by_default';
const GLOBAL_NOTICE_SECTION = 'global';

export const PDF_NOTICE_SECTIONS = ['global', 'rfq', 'purchaseOrder', 'subChangeOrder'] as const;
export type PdfNoticeSection = (typeof PDF_NOTICE_SECTIONS)[number];

export type PdfNoticeOption = {
    id: string;
    name: string;
    section: PdfNoticeSection;
    sectionLabel: string;
    title: string;
    html: string;
    isDefault: boolean;
    isSectionDefault: boolean;
};

export type PdfNoticeConfig = {
    section: PdfNoticeSection;
    sectionLabel: string;
    includeByDefault: boolean;
    options: PdfNoticeOption[];
    defaultOptionId: string | null;
};

export type PdfNoticeRequest = {
    addWarningNotice?: boolean | null;
    warningNoticeTitle?: string | null;
    warningNoticeHtml?: string | null;
};

export type ResolvedPdfNotice = {
    included: boolean;
    title: string;
    html: string;
};

export const PDF_NOTICE_SECTION_LABELS: Record<PdfNoticeSection, string> = {
    global: 'Global',
    rfq: 'RFQ',
    purchaseOrder: 'Purchase Order',
    subChangeOrder: 'SCO',
};

function assertSection(section: string): PdfNoticeSection {
    if (PDF_NOTICE_SECTIONS.includes(section as PdfNoticeSection)) {
        return section as PdfNoticeSection;
    }
    throw new BadRequestError('Invalid PDF warning section');
}

function getIncludeByDefaultConfigId(section: PdfNoticeSection): string {
    return `pdf-notice:${section}:include-by-default`;
}

function isDocumentSection(section: PdfNoticeSection): boolean {
    return section !== GLOBAL_NOTICE_SECTION;
}

function sanitizePdfNoticeTitle(value: string | null | undefined): string {
    return (value ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
}

function getFallbackOption(section: PdfNoticeSection): PdfNoticeOption | null {
    const fallback = getDefaultPdfNotice(section);
    const title = sanitizePdfNoticeTitle(fallback.title);
    const html = sanitizePdfTermsHtml(fallback.html);
    if (!title || !hasPdfTermsContent(html)) return null;

    return {
        id: `fallback-${section}-notice`,
        name: `${PDF_NOTICE_SECTION_LABELS[section]} Default Warning`,
        section,
        sectionLabel: PDF_NOTICE_SECTION_LABELS[section],
        title,
        html,
        isDefault: false,
        isSectionDefault: true,
    };
}

async function getIncludeByDefault(section: PdfNoticeSection): Promise<boolean> {
    if (!isDocumentSection(section)) return false;

    const config = await prisma.configuration.findUnique({
        where: { id: getIncludeByDefaultConfigId(section) },
    });

    if (config?.value === 'true') return true;
    if (config?.value === 'false') return false;
    return getDefaultPdfNoticeIncludeByDefault(section);
}

async function getDbOptions(section: PdfNoticeSection): Promise<PdfNoticeOption[]> {
    const settings = await TemplateSettingService.list({
        kind: 'PDF_NOTICE',
        key: section,
        status: 'ACTIVE',
        includeDeleted: false,
    });

    return settings
        .map((setting) => {
            const value = setting.value as { title?: string; bodyHtml?: string };
            return {
                id: setting.id,
                name: setting.name,
                section,
                sectionLabel: PDF_NOTICE_SECTION_LABELS[section],
                title: sanitizePdfNoticeTitle(value.title),
                html: sanitizePdfTermsHtml(value.bodyHtml),
                isDefault: false,
                isSectionDefault: setting.isDefault,
            };
        })
        .filter((setting) => setting.title && hasPdfTermsContent(setting.html));
}

async function getOptionsForSection(section: PdfNoticeSection): Promise<PdfNoticeOption[]> {
    const dbOptions = await getDbOptions(section);
    if (dbOptions.length) return dbOptions;

    const fallback = getFallbackOption(section);
    return fallback ? [fallback] : [];
}

function chooseDefaultOption(
    section: PdfNoticeSection,
    options: PdfNoticeOption[]
): PdfNoticeOption | undefined {
    return (
        options.find((option) => option.section === section && option.isSectionDefault) ??
        options.find((option) => option.section === section) ??
        options.find(
            (option) => option.section === GLOBAL_NOTICE_SECTION && option.isSectionDefault
        ) ??
        options.find((option) => option.section === GLOBAL_NOTICE_SECTION)
    );
}

export const PdfNoticeService = {
    assertSection,

    getConfig: async (rawSection: string): Promise<PdfNoticeConfig> => {
        const section = assertSection(rawSection);
        const sectionOptions = await getOptionsForSection(section);
        const globalOptions =
            section === GLOBAL_NOTICE_SECTION
                ? []
                : await getOptionsForSection(GLOBAL_NOTICE_SECTION);
        const options = [...sectionOptions, ...globalOptions];
        const defaultOption = chooseDefaultOption(section, options);

        return {
            section,
            sectionLabel: PDF_NOTICE_SECTION_LABELS[section],
            includeByDefault: await getIncludeByDefault(section),
            options: options.map((option) => ({
                ...option,
                isDefault: option.id === defaultOption?.id,
            })),
            defaultOptionId: defaultOption?.id ?? null,
        };
    },

    updateSettings: async (
        rawSection: string,
        settings: { includeByDefault: boolean },
        userId: string
    ): Promise<PdfNoticeConfig> => {
        const section = assertSection(rawSection);
        if (!isDocumentSection(section)) {
            throw new BadRequestError('Global PDF warnings cannot be enabled by default');
        }

        await prisma.configuration.upsert({
            where: { id: getIncludeByDefaultConfigId(section) },
            create: {
                id: getIncludeByDefaultConfigId(section),
                name: PDF_NOTICE_CONFIG_NAME,
                type: PDF_NOTICE_CONFIG_TYPE,
                parent: 'pdf',
                child: 'notice',
                key1: section,
                key2: 'includeByDefault',
                value: String(settings.includeByDefault),
            },
            update: {
                value: String(settings.includeByDefault),
                key2: 'includeByDefault',
            },
        });

        void userId;
        return PdfNoticeService.getConfig(section);
    },

    resolveForRequest: async (
        rawSection: string,
        request: PdfNoticeRequest
    ): Promise<ResolvedPdfNotice> => {
        const config = await PdfNoticeService.getConfig(rawSection);
        const include =
            request.addWarningNotice == null
                ? config.includeByDefault
                : request.addWarningNotice === true;

        if (!include) return { included: false, title: '', html: '' };

        const defaultOption = config.options.find((option) => option.id === config.defaultOptionId);
        const requestTitle =
            sanitizePdfNoticeTitle(request.warningNoticeTitle) || defaultOption?.title || 'Warning';
        const requestHtml = sanitizePdfTermsHtml(request.warningNoticeHtml);
        if (requestTitle && hasPdfTermsContent(requestHtml)) {
            return { included: true, title: requestTitle, html: requestHtml };
        }

        if (defaultOption?.title && hasPdfTermsContent(defaultOption.html)) {
            return { included: true, title: defaultOption.title, html: defaultOption.html };
        }

        throw new BadRequestError('Warning box content is required');
    },
};
