import { getDefaultPdfProfile, type PdfProfileConfig } from '@modules/pdf/defaults';
import { TemplateSettingService } from '@modules/template-setting';
import { BadRequestError } from '@utils';

export const DEFAULT_PDF_PROFILE_KEY = 'elliDefault';

export type PdfProfile = PdfProfileConfig;

export async function resolvePdfProfile(
    profile?: PdfProfile | null,
    profileKey = DEFAULT_PDF_PROFILE_KEY
): Promise<PdfProfile> {
    if (profile) return profile;

    const configured = await TemplateSettingService.getDefaultPdfProfile(profileKey);
    if (configured) return configured;

    const fallback = getDefaultPdfProfile(profileKey);
    if (fallback) return fallback;

    throw new BadRequestError(`PDF profile is not configured: ${profileKey}`);
}
