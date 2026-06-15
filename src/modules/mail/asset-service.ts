import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

import { BadRequestError, NotFoundError } from '@utils';

const ASSET_ROOT = process.env.MAIL_ASSET_DIR || join(process.cwd(), 'src/modules/mail/assets');

const CONTENT_TYPES: Record<string, string> = {
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
};

export type MailAsset = {
    fileName: string;
    contentType: string;
    bytes: Uint8Array;
};

export async function readMailAsset(fileName: string): Promise<MailAsset> {
    const assetPath = resolveMailAssetPath(fileName);

    if (!existsSync(assetPath)) {
        throw new NotFoundError('Mail asset not found');
    }

    return {
        fileName: basename(fileName),
        contentType: getMailAssetContentType(fileName),
        bytes: await readFile(assetPath),
    };
}

export function mailAssetExists(fileName: string): boolean {
    return existsSync(resolveMailAssetPath(fileName));
}

export function getMailAssetContentType(fileName: string): string {
    return CONTENT_TYPES[extname(fileName).toLowerCase()] || 'application/octet-stream';
}

export function getMailAssetDataUri(fileName: string): string | null {
    const assetPath = resolveMailAssetPath(fileName);

    if (!existsSync(assetPath)) return null;

    const contentType = getMailAssetContentType(fileName);
    const base64 = readFileSync(assetPath).toString('base64');
    return `data:${contentType};base64,${base64}`;
}

function resolveMailAssetPath(fileName: string): string {
    if (!fileName || basename(fileName) !== fileName) {
        throw new BadRequestError('Invalid mail asset name');
    }

    return join(ASSET_ROOT, fileName);
}
