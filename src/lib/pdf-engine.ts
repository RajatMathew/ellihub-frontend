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
const DEFAULT_PDF_ENGINE_API_KEY_HEADER = 'X-API-Key';
const DEFAULT_PDF_ENGINE_API_KEY = 'local-dev-key';

function getPdfEngineUrl(): string {
    return (process.env.PDF_ENGINE_URL || DEFAULT_PDF_ENGINE_URL).replace(/\/+$/, '');
}

function getPdfEngineHeaders(): Record<string, string> {
    const apiKeyHeader = process.env.PDF_ENGINE_API_KEY_HEADER || DEFAULT_PDF_ENGINE_API_KEY_HEADER;
    const apiKey = process.env.PDF_ENGINE_API_KEY || DEFAULT_PDF_ENGINE_API_KEY;

    return {
        'Content-Type': 'application/json',
        [apiKeyHeader]: apiKey,
    };
}

function formatPdfEngineError(status: number, statusText: string, body: string): string {
    const detail = body.trim();
    if (!detail) return `PDF engine failed with ${status} ${statusText}`;
    return `PDF engine failed with ${status} ${statusText}: ${detail.slice(0, 500)}`;
}

export async function renderPdf(request: PdfRenderRequest): Promise<PdfRenderResult> {
    const response = await fetch(`${getPdfEngineUrl()}/render`, {
        method: 'POST',
        headers: getPdfEngineHeaders(),
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
