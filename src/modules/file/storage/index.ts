import { InternalServerError } from '@utils';

import { azureBlobStorageService } from './azure-blob-storage';
import { s3StorageService } from './s3-storage';

import type { FileStorageService } from './types';

type StorageProvider = 's3' | 'azure';

function getStorageProvider(): StorageProvider {
    const provider = (process.env.STORAGE_PROVIDER || 's3').trim().toLowerCase();

    if (provider === 's3' || provider === 'azure') return provider;

    throw new InternalServerError(`Unsupported STORAGE_PROVIDER "${provider}".`);
}

export const storageProvider = getStorageProvider();

export const storageService: FileStorageService =
    storageProvider === 'azure' ? azureBlobStorageService : s3StorageService;

export type { FileStorageService, StorageWriter, StorageWriteChunk } from './types';
