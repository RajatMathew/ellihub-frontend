import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type PdfTermsSectionConfig = {
    defaultHtml?: string;
    includeByDefault?: boolean;
};

type PdfNoticeSectionConfig = {
    defaultTitle?: string;
    defaultHtml?: string;
    includeByDefault?: boolean;
};

export type PdfProfileConfig = {
    company: {
        name: string;
        addressLines: string[];
        phone: string;
        logoPath: string;
    };
    shipToName?: string;
};

type PdfDefaultsConfig = {
    profiles?: Record<string, PdfProfileConfig>;
    termsAndConditions?: {
        sections?: Record<string, PdfTermsSectionConfig>;
    };
    warningNotices?: {
        sections?: Record<string, PdfNoticeSectionConfig>;
    };
};

const PDF_DEFAULTS_ROOT = join(process.cwd(), 'src/modules/pdf/templates');
const PDF_DEFAULTS_CONFIG_PATH = join(PDF_DEFAULTS_ROOT, 'pdf-defaults.json');

function getPdfDefaultsConfig(): PdfDefaultsConfig {
    return JSON.parse(readFileSync(PDF_DEFAULTS_CONFIG_PATH, 'utf-8')) as PdfDefaultsConfig;
}

export function getDefaultPdfTermsHtml(section: string): string {
    return getPdfDefaultsConfig().termsAndConditions?.sections?.[section]?.defaultHtml ?? '';
}

export function getDefaultPdfTermsIncludeByDefault(section: string): boolean {
    return (
        getPdfDefaultsConfig().termsAndConditions?.sections?.[section]?.includeByDefault ?? false
    );
}

export function getDefaultPdfNotice(section: string): { title: string; html: string } {
    const config = getPdfDefaultsConfig().warningNotices?.sections?.[section];
    return {
        title: config?.defaultTitle ?? '',
        html: config?.defaultHtml ?? '',
    };
}

export function getDefaultPdfNoticeIncludeByDefault(section: string): boolean {
    return getPdfDefaultsConfig().warningNotices?.sections?.[section]?.includeByDefault ?? false;
}

export function getDefaultPdfProfile(profileKey: string): PdfProfileConfig | null {
    return getPdfDefaultsConfig().profiles?.[profileKey] ?? null;
}
