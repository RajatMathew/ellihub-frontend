import { InternalServerError } from '@utils';

export type PdfJsonValue = string | number | boolean | null | PdfJsonObject | PdfJsonValue[];

export type PdfJsonObject = {
    [key: string]: PdfJsonValue;
};

type PdfBrandingPayload = {
    company_name?: string;
    logo_url?: string;
    primary_color?: string;
};

type PdfRenderSettingsPayload = {
    filename?: string;
    return_mode?: 'inline' | 'download_url';
};

export type PdfRenderRequest = {
    template_id: string;
    data: PdfJsonObject;
    branding?: PdfBrandingPayload;
    settings?: PdfRenderSettingsPayload;
};

export type PdfRenderResult = {
    bytes: Uint8Array;
    contentType: string;
    requestHash: string | null;
    cacheHit: boolean;
};

const DEFAULT_PDF_ENGINE_URL = 'http://127.0.0.1:8000';

function getPdfEngineUrl(): string {
    return (process.env.PDF_ENGINE_URL || DEFAULT_PDF_ENGINE_URL).replace(/\/+$/, '');
}

function formatPdfEngineError(status: number, statusText: string, body: string): string {
    const detail = body.trim();
    if (!detail) return `PDF engine failed with ${status} ${statusText}`;
    return `PDF engine failed with ${status} ${statusText}: ${detail.slice(0, 500)}`;
}

export async function renderPdf(request: PdfRenderRequest): Promise<PdfRenderResult> {
    const response = await fetch(`${getPdfEngineUrl()}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new InternalServerError(
            formatPdfEngineError(response.status, response.statusText, await response.text())
        );
    }

    return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        contentType: response.headers.get('content-type') || 'application/pdf',
        requestHash: response.headers.get('x-request-hash'),
        cacheHit: response.headers.get('x-cache-hit') === 'true',
    };
}
