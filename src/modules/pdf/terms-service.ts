import { prisma } from '@lib/prisma';
import { getDefaultPdfTermsHtml, getDefaultPdfTermsIncludeByDefault } from '@modules/pdf/defaults';
import { TemplateSettingService } from '@modules/template-setting';
import { BadRequestError } from '@utils';

const PDF_TERMS_CONFIG_TYPE = 'pdf_terms';
const PDF_TERMS_CONFIG_NAME = 'pdf.terms.include_by_default';
const GLOBAL_TERMS_SECTION = 'global';
const ALLOWED_TERMS_TAGS = new Set([
    'p',
    'div',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'ul',
    'ol',
    'li',
]);

export const PDF_TERMS_SECTIONS = ['global', 'rfq', 'purchaseOrder', 'subChangeOrder'] as const;
export type PdfTermsSection = (typeof PDF_TERMS_SECTIONS)[number];

export type PdfTermsOption = {
    id: string;
    name: string;
    section: PdfTermsSection;
    sectionLabel: string;
    html: string;
    isDefault: boolean;
    isSectionDefault: boolean;
};

export type PdfTermsConfig = {
    section: PdfTermsSection;
    sectionLabel: string;
    includeByDefault: boolean;
    options: PdfTermsOption[];
    defaultOptionId: string | null;
};

export type PdfTermsRequest = {
    addTermsAndConditions?: boolean | null;
    termsAndConditionsHtml?: string | null;
};

export type ResolvedPdfTerms = {
    included: boolean;
    html: string;
};

export const PDF_TERMS_SECTION_LABELS: Record<PdfTermsSection, string> = {
    global: 'Global',
    rfq: 'RFQ',
    purchaseOrder: 'Purchase Order',
    subChangeOrder: 'SCO',
};

function assertSection(section: string): PdfTermsSection {
    if (PDF_TERMS_SECTIONS.includes(section as PdfTermsSection)) return section as PdfTermsSection;
    throw new BadRequestError('Invalid PDF terms section');
}

function getIncludeByDefaultConfigId(section: PdfTermsSection): string {
    return `pdf-terms:${section}:include-by-default`;
}

export function sanitizePdfTermsHtml(value: string | null | undefined): string {
    if (!value?.trim()) return '';
    return value
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(
            /<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi,
            ''
        )
        .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '')
        .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, rawTag: string) => {
            const tag = rawTag.toLowerCase();
            if (!ALLOWED_TERMS_TAGS.has(tag)) return '';
            if (tag === 'br') return '<br />';
            return match.startsWith('</') ? `</${tag}>` : `<${tag}>`;
        })
        .trim();
}

export function hasPdfTermsContent(value: string): boolean {
    return (
        value
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .trim().length > 0
    );
}

function isDocumentSection(section: PdfTermsSection): boolean {
    return section !== GLOBAL_TERMS_SECTION;
}

function getFallbackOption(section: PdfTermsSection): PdfTermsOption | null {
    const html = sanitizePdfTermsHtml(getDefaultPdfTermsHtml(section));
    if (!hasPdfTermsContent(html)) return null;

    return {
        id: `fallback-${section}-terms`,
        name: `${PDF_TERMS_SECTION_LABELS[section]} Default Terms`,
        section,
        sectionLabel: PDF_TERMS_SECTION_LABELS[section],
        html,
        isDefault: false,
        isSectionDefault: true,
    };
}

async function getIncludeByDefault(section: PdfTermsSection): Promise<boolean> {
    if (!isDocumentSection(section)) return false;

    const config = await prisma.configuration.findUnique({
        where: { id: getIncludeByDefaultConfigId(section) },
    });

    if (config?.value === 'true') return true;
    if (config?.value === 'false') return false;
    return getDefaultPdfTermsIncludeByDefault(section);
}

async function getDbOptions(section: PdfTermsSection): Promise<PdfTermsOption[]> {
    const settings = await TemplateSettingService.list({
        kind: 'PDF_TERMS',
        key: section,
        status: 'ACTIVE',
        includeDeleted: false,
    });

    return settings
        .map((setting) => ({
            id: setting.id,
            name: setting.name,
            section,
            sectionLabel: PDF_TERMS_SECTION_LABELS[section],
            html: sanitizePdfTermsHtml((setting.value as { html?: string }).html),
            isDefault: false,
            isSectionDefault: setting.isDefault,
        }))
        .filter((setting) => hasPdfTermsContent(setting.html));
}

async function getOptionsForSection(section: PdfTermsSection): Promise<PdfTermsOption[]> {
    const dbOptions = await getDbOptions(section);
    if (dbOptions.length) return dbOptions;

    const fallback = getFallbackOption(section);
    return fallback ? [fallback] : [];
}

function chooseDefaultOption(
    section: PdfTermsSection,
    options: PdfTermsOption[]
): PdfTermsOption | undefined {
    return (
        options.find((option) => option.section === section && option.isSectionDefault) ??
        options.find((option) => option.section === section) ??
        options.find(
            (option) => option.section === GLOBAL_TERMS_SECTION && option.isSectionDefault
        ) ??
        options.find((option) => option.section === GLOBAL_TERMS_SECTION)
    );
}

export const PdfTermsService = {
    assertSection,

    getConfig: async (rawSection: string): Promise<PdfTermsConfig> => {
        const section = assertSection(rawSection);
        const sectionOptions = await getOptionsForSection(section);
        const globalOptions =
            section === GLOBAL_TERMS_SECTION
                ? []
                : await getOptionsForSection(GLOBAL_TERMS_SECTION);
        const options = [...sectionOptions, ...globalOptions];
        const defaultOption = chooseDefaultOption(section, options);

        return {
            section,
            sectionLabel: PDF_TERMS_SECTION_LABELS[section],
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
    ): Promise<PdfTermsConfig> => {
        const section = assertSection(rawSection);
        if (!isDocumentSection(section)) {
            throw new BadRequestError('Global PDF terms cannot be enabled by default');
        }

        await prisma.configuration.upsert({
            where: { id: getIncludeByDefaultConfigId(section) },
            create: {
                id: getIncludeByDefaultConfigId(section),
                name: PDF_TERMS_CONFIG_NAME,
                type: PDF_TERMS_CONFIG_TYPE,
                parent: 'pdf',
                child: 'terms',
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
        return PdfTermsService.getConfig(section);
    },

    getDefaultTerms: async (rawSection: string): Promise<{ html: string }> => {
        const config = await PdfTermsService.getConfig(rawSection);
        const option = config.options.find((item) => item.id === config.defaultOptionId);
        return { html: option?.html ?? '' };
    },

    resolveForRequest: async (
        rawSection: string,
        request: PdfTermsRequest
    ): Promise<ResolvedPdfTerms> => {
        const config = await PdfTermsService.getConfig(rawSection);
        const include =
            request.addTermsAndConditions == null
                ? config.includeByDefault
                : request.addTermsAndConditions === true;

        if (!include) return { included: false, html: '' };

        const sanitizedRequestHtml = sanitizePdfTermsHtml(request.termsAndConditionsHtml);
        if (hasPdfTermsContent(sanitizedRequestHtml)) {
            return { included: true, html: sanitizedRequestHtml };
        }

        const defaultOption = config.options.find((option) => option.id === config.defaultOptionId);
        if (defaultOption?.html && hasPdfTermsContent(defaultOption.html)) {
            return { included: true, html: defaultOption.html };
        }

        throw new BadRequestError('Terms and conditions content is required');
    },
};
